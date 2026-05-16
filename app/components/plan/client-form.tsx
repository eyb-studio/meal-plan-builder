import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { ACTIVITY_LABELS, GOAL_LABELS } from "~/lib/macros"
import type { Activity, Client, Gender, Goal } from "~/lib/types"

type Props = {
  client: Client
  onChange: (next: Client) => void
}

export function ClientForm({ client, onChange }: Props) {
  const update = <K extends keyof Client>(key: K, value: Client[K]) =>
    onChange({ ...client, [key]: value })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-3 gap-y-4">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="Client name"
            value={client.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Gender</Label>
          <Select
            value={client.gender}
            onValueChange={(v) => update("gender", v as Gender)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            type="number"
            min={10}
            max={100}
            value={client.age}
            onChange={(e) => update("age", Number(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="height">Height (cm)</Label>
          <Input
            id="height"
            type="number"
            min={100}
            max={250}
            value={client.heightCm}
            onChange={(e) => update("heightCm", Number(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="weight">Weight (kg)</Label>
          <Input
            id="weight"
            type="number"
            min={30}
            max={300}
            step={0.1}
            value={client.weightKg}
            onChange={(e) => update("weightKg", Number(e.target.value) || 0)}
          />
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label>Activity</Label>
          <Select
            value={client.activity}
            onValueChange={(v) => update("activity", v as Activity)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ACTIVITY_LABELS) as Activity[]).map((a) => (
                <SelectItem key={a} value={a}>
                  {ACTIVITY_LABELS[a]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label>Goal</Label>
          <Select
            value={client.goal}
            onValueChange={(v) => update("goal", v as Goal)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
                <SelectItem key={g} value={g}>
                  {GOAL_LABELS[g]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
