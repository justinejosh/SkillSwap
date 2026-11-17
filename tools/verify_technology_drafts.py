"""Offline authoring checks, not a student-code runner or academic validation.

Executes fixed developer-authored Java and local Git examples in a temporary
directory, SQL SELECT examples in memory, and independent arithmetic/reference
oracles. Never connects to a database service or performs Git commits/remotes.
"""
from pathlib import Path
import ipaddress
import json
import os
import re
import shutil
import sqlite3
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
drafts = {p.stem: json.loads(p.read_text(encoding="utf-8")) for p in (ROOT / "knoxite-backend/content/drafts").glob("*.json")}
checks = []
def key(skill, item):
    return drafts[skill]["answerKey"][skill + "-" + item]["answer"]
def equal(skill, item, answer):
    assert key(skill, item) == str(answer), (skill, item)
    checks.append(skill + "-" + item)
def run(args, cwd):
    return subprocess.run(args, cwd=cwd, capture_output=True, text=True, timeout=30,
                          creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)

with tempfile.TemporaryDirectory(prefix="knoxite-tech-answer-") as directory:
    temp = Path(directory).resolve()
    assert temp.parent == Path(tempfile.gettempdir()).resolve()
    assert shutil.which("javac") and shutil.which("java"), "A local JDK is required; do not report Java execution without it."
    source = '''public class DraftChecks {
      static int twice(int n) { return n*2; }
      public static void main(String[] args) {
        System.out.println("B02="+(7/2)); System.out.println("B03="+(7%3));
        int[] a={4,8,12}; System.out.println("B04="+a[0]);
        int s=0; for(int i=0;i<3;i++)s+=i; System.out.println("B05="+s);
        System.out.println("B06="+a.length); System.out.println("B07="+twice(5));
        System.out.println("B09="+((4>2)&&(1>3)));
        System.out.println("A03="+((double)5/2));
        int[] x={1,2};int[] y=x;y[0]=9;System.out.println("A04="+x[0]);
        int[] values=null;System.out.println("NULLSAFE="+(values!=null&&values.length>0));
        String aa=new String("Knoxite"),bb=new String("Knoxite");
        System.out.println("EQUALS="+aa.equals(bb)); System.out.println("IDENTITY="+(aa==bb));
        try{Integer.parseInt("abc");}catch(NumberFormatException e){System.out.println("A06=invalid");}
      }}'''
    (temp / "DraftChecks.java").write_text(source, encoding="utf-8")
    assert run(["javac", "DraftChecks.java"], temp).returncode == 0
    result = run(["java", "-cp", str(temp), "DraftChecks"], temp)
    assert result.returncode == 0
    outputs = dict(line.split("=", 1) for line in result.stdout.strip().splitlines())
    for item in ["B02", "B03", "B04", "B05", "B06", "B07", "B09", "A04", "A06"]:
        equal("java-programming-fundamentals", item, outputs[item])
    assert outputs["A03"] == "2.5"
    equal("java-programming-fundamentals", "A03", "(double) total / count")
    assert outputs["NULLSAFE"] == "false" and outputs["EQUALS"] == "true" and outputs["IDENTITY"] == "false"
    equal("java-programming-fundamentals", "A05", "values != null && values.length > 0")
    equal("java-programming-fundamentals", "A02", "a.equals(b)")
    (temp / "InvalidFinal.java").write_text("class InvalidFinal { void f(){ final int limit=3; limit=4; } }", encoding="utf-8")
    assert run(["javac", "InvalidFinal.java"], temp).returncode != 0
    equal("java-programming-fundamentals", "B08", "limit=4;")

    # A disposable Git repository only. No commit, reset, push or remote action.
    repo = temp / "git-fixture"; repo.mkdir()
    assert run(["git", "init", "--quiet"], repo).returncode == 0
    (repo / "tracked.txt").write_text("version 1\n", encoding="utf-8")
    assert run(["git", "add", "tracked.txt"], repo).returncode == 0
    (repo / "tracked.txt").write_text("version 2\n", encoding="utf-8")
    assert run(["git", "show", ":tracked.txt"], repo).stdout.strip() == "version 1"
    equal("git-github-basics", "A01", "Version 1")
    (repo / ".gitignore").write_text("tracked.txt\nignored.txt\n", encoding="utf-8")
    (repo / "ignored.txt").write_text("synthetic\n", encoding="utf-8")
    assert run(["git", "check-ignore", "--quiet", "tracked.txt"], repo).returncode == 1
    assert run(["git", "check-ignore", "--quiet", "ignored.txt"], repo).returncode == 0
    equal("git-github-basics", "B09", "No")

with sqlite3.connect(":memory:") as db:
    db.executescript("""CREATE TABLE results(score INTEGER); INSERT INTO results VALUES(60),(80),(90);
      CREATE TABLE students(name TEXT,department TEXT); INSERT INTO students VALUES('A','CS'),('B','CS'),('C','N');
      CREATE TABLE optional(value INTEGER,completed_at TEXT); INSERT INTO optional VALUES(10,NULL),(NULL,'done'),(20,NULL);
      CREATE TABLE parent(id INTEGER); INSERT INTO parent VALUES(1),(2);
      CREATE TABLE child(id INTEGER,parent_id INTEGER,active INTEGER); INSERT INTO child VALUES(10,1,0);""")
    equal("sql-fundamentals", "A01", db.execute("SELECT SUM(score) FROM results WHERE score>=80").fetchone()[0])
    equal("sql-fundamentals", "B05", db.execute("SELECT COUNT(value) FROM optional").fetchone()[0])
    # The selected answer is verified against a known safe SELECT, never run as arbitrary SQL.
    q="SELECT department FROM students GROUP BY department HAVING COUNT(*) >= 2"
    equal("sql-fundamentals", "A02", q)
    assert db.execute(q).fetchall() == [("CS",)]
    assert db.execute("SELECT p.id,COUNT(c.id) FROM parent p LEFT JOIN child c ON c.parent_id=p.id GROUP BY p.id ORDER BY p.id").fetchall() == [(1,1),(2,0)]
    equal("sql-fundamentals", "A03", "COUNT(child.id), where child.id is non-null for real children")
    assert db.execute("SELECT COUNT(*) FROM optional WHERE completed_at IS NULL").fetchone()[0] == 2
    equal("sql-fundamentals", "A04", "WHERE completed_at IS NULL")
    assert db.execute("SELECT p.id FROM parent p LEFT JOIN child c ON c.parent_id=p.id AND c.active=1 ORDER BY p.id").fetchall() == [(1,),(2,)]
    equal("sql-fundamentals", "A05", "In the ON condition with the department match")
    assert db.execute("SELECT ?", ("O'Neil",)).fetchone()[0] == "O'Neil"
    equal("sql-fundamentals", "A06", "Use a placeholder and bind the entire name as data")

equal("html-css-fundamentals", "A01", str(240+2*20+2*5)+"px")
equal("computer-networking-basics", "A01", len(list(ipaddress.ip_network("192.0.2.0/26").hosts())))
assert ipaddress.ip_interface("192.168.1.23/24").network == ipaddress.ip_interface("192.168.1.99/24").network
equal("computer-networking-basics", "A02", "192.168.1.23 and 192.168.1.99")
private=[ipaddress.ip_network(n) for n in ["10.0.0.0/8","172.16.0.0/12","192.168.0.0/16"]]
addresses=["192.168.4.20","8.8.8.8","1.1.1.1","203.0.113.10"]
assert [a for a in addresses if any(ipaddress.ip_address(a) in n for n in private)] == ["192.168.4.20"]
equal("computer-networking-basics", "B05", "192.168.4.20")
equal("microsoft-excel-fundamentals", "B02", sum([2,3,5]))
equal("microsoft-excel-fundamentals", "B03", sum([2,4,6])//3)
equal("microsoft-excel-fundamentals", "B06", sum(isinstance(v,(int,float)) for v in [1,"x",None]))
equal("microsoft-excel-fundamentals", "B07", len(range(1,4)))
equal("microsoft-excel-fundamentals", "B08", f"{0.25*100:.0f}%")
equal("microsoft-excel-fundamentals", "B10", "Pass" if 80>=80 else "Retry")
equal("microsoft-excel-fundamentals", "A02", (80+0)//2)
equal("microsoft-excel-fundamentals", "A03", f"{(80*2+90)/(2+1):.2f}")
equal("microsoft-excel-fundamentals", "A04", sum(x>=80 for x in [79,80,95]))
def shift(match):
    colfix,col,rowfix,row=match.groups()
    return colfix+(col if colfix else chr(ord(col)+1))+rowfix+str(int(row)+(0 if rowfix else 1))
translated=re.sub(r"(\$?)([A-Z])(\$?)([0-9]+)",shift,"=$A2*B$1")
equal("microsoft-excel-fundamentals", "A01", translated)
print(json.dumps({"independentlyCheckedDraftItems":len(checks),"checks":checks,
  "java":"Fixed authored snippets compiled/executed; final reassignment rejected", "sql":"SQLite in-memory oracle for the standard SELECT subset, not a MySQL-engine claim",
  "excel":"Independent arithmetic/reference oracles, not execution in Microsoft Excel",
  "git":"Temporary staging/ignore checks only; no commits/remotes", "academicApproval":"NOT_REVIEWED"}))
