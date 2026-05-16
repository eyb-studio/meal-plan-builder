import { RotateCcw } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import type { Macros } from "~/lib/types"

type Props = {
  targets: Macros
  onChange: (next: Macros) => void
  onRecalculate: () => void
  customized: boolean
}

export function MacroTargets({
  targets,
  onChange,
  onRecalculate,
  customized,
}: Props) {
  const update = <K extends keyof Macros>(key: K, value: number) =>
    onChange({ ...targets, [key]: value })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Daily targets</CardTitle>
        {customized && (
          <Button
            variant="ghost"
            size="xs"
            onClick={onRecalculate}
            title="Recalculate from client data"
          >
            <RotateCcw />
            Reset
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-3 gap-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="cal">Calories</Label>
          <Input
            id="cal"
            type="number"
            value={targets.calories}
            onChange={(e) => update("calories", Number(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pro">Protein (g)</Label>
          <Input
            id="pro"
            type="number"
            value={targets.protein}
            onChange={(e) => update("protein", Number(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="carb">Carbs (g)</Label>
          <Input
            id="carb"
            type="number"
            value={targets.carbs}
            onChange={(e) => update("carbs", Number(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fat">Fat (g)</Label>
          <Input
            id="fat"
            type="number"
            value={targets.fat}
            onChange={(e) => update("fat", Number(e.target.value) || 0)}
          />
        </div>
      </CardContent>
    </Card>
  )
}
