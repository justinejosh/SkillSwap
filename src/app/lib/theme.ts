import { useLayoutEffect, useState } from "react";

// Preserve Knoxite's existing per-account keys. The dashboard's default is
// light; an OS/global preference must not override an account on other routes.
export function currentAccountId(): string | null {
  try { return JSON.parse(localStorage.getItem("knoxite_user") || "{}").id || null; }
  catch { return null; }
}
export function storedTheme(): "light" | "dark" {
  try { const id=currentAccountId(); return id && localStorage.getItem(`theme_${id}`)==="dark" ? "dark" : "light"; }
  catch { return "light"; }
}
export function applyStoredTheme() {
  const theme=storedTheme();
  document.documentElement.classList.toggle("dark",theme==="dark");
  document.documentElement.style.colorScheme=theme;
  return theme;
}
export function setAccountTheme(theme:"light"|"dark") {
  const id=currentAccountId(); if(id)localStorage.setItem(`theme_${id}`,theme);
  applyStoredTheme(); window.dispatchEvent(new Event("knoxite-theme-changed"));
}
export function useAccountTheme() {
  const [theme,setTheme]=useState(storedTheme);
  useLayoutEffect(()=>{
    const sync=()=>setTheme(applyStoredTheme());
    const events=["storage","knoxite-theme-changed","knoxite-session-ended","pageshow","popstate"];
    events.forEach(event=>window.addEventListener(event,sync));sync();
    return()=>events.forEach(event=>window.removeEventListener(event,sync));
  },[]);
  return [theme==="dark",()=>setAccountTheme(storedTheme()==="dark"?"light":"dark")] as const;
}
export function ThemeSync(){useAccountTheme();return null;}
