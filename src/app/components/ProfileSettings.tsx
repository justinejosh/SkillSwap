import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Checkbox } from "@/app/components/ui/checkbox";

export function ProfileSettings() {
  const [location, setLocation] = useState("New York");
  const [mode, setMode] = useState("both");
  const [availability, setAvailability] = useState({
    weekdays: true,
    weekends: true,
    mornings: false,
    afternoons: true,
    evenings: true,
  });

  const handleSave = () => {
    console.log("Saving settings:", { location, mode, availability });
    alert("Settings saved successfully!");
  };

  return (
    <div className="space-y-6">
      {/* Location & Mode */}
      <Card className="bg-white/90 backdrop-blur border-blue-100">
        <CardHeader>
          <CardTitle className="text-blue-900">Location & Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location" className="text-blue-900">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City or Campus"
              className="border-blue-200 focus:border-blue-400"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mode" className="text-blue-900">Preferred Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="border-blue-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online Only</SelectItem>
                <SelectItem value="in-person">In-Person Only</SelectItem>
                <SelectItem value="both">Both Online & In-Person</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Availability Schedule */}
      <Card className="bg-white/90 backdrop-blur border-blue-100">
        <CardHeader>
          <CardTitle className="text-blue-900">Availability Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="weekdays"
                checked={availability.weekdays}
                onCheckedChange={(checked) =>
                  setAvailability({ ...availability, weekdays: checked as boolean })
                }
              />
              <label htmlFor="weekdays" className="text-sm text-blue-900 cursor-pointer">
                Weekdays
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="weekends"
                checked={availability.weekends}
                onCheckedChange={(checked) =>
                  setAvailability({ ...availability, weekends: checked as boolean })
                }
              />
              <label htmlFor="weekends" className="text-sm text-blue-900 cursor-pointer">
                Weekends
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mornings"
                checked={availability.mornings}
                onCheckedChange={(checked) =>
                  setAvailability({ ...availability, mornings: checked as boolean })
                }
              />
              <label htmlFor="mornings" className="text-sm text-blue-900 cursor-pointer">
                Mornings (6AM - 12PM)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="afternoons"
                checked={availability.afternoons}
                onCheckedChange={(checked) =>
                  setAvailability({ ...availability, afternoons: checked as boolean })
                }
              />
              <label htmlFor="afternoons" className="text-sm text-blue-900 cursor-pointer">
                Afternoons (12PM - 6PM)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="evenings"
                checked={availability.evenings}
                onCheckedChange={(checked) =>
                  setAvailability({ ...availability, evenings: checked as boolean })
                }
              />
              <label htmlFor="evenings" className="text-sm text-blue-900 cursor-pointer">
                Evenings (6PM - 12AM)
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
        Save Settings
      </Button>
    </div>
  );
}
