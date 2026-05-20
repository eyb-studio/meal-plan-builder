import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { nextId } from "~/lib/hooks"
import type { Food, FoodCategory } from "~/lib/types"

const CATEGORIES: FoodCategory[] = [
  "protein",
  "carb",
  "fat",
  "veg",
  "fruit",
  "supplement",
  "other",
]

type Props = {
  onAdd: (food: Food) => void
}

export function AddCustomFoodDialog({ onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [category, setCategory] = useState<FoodCategory>("protein")
  const [calories, setCalories] = useState("")
  const [protein, setProtein] = useState("")
  const [carbs, setCarbs] = useState("")
  const [fat, setFat] = useState("")

  const reset = () => {
    setName("")
    setCategory("protein")
    setCalories("")
    setProtein("")
    setCarbs("")
    setFat("")
  }

  const handleAdd = () => {
    if (!name.trim()) return
    onAdd({
      id: nextId("custom"),
      name: name.trim(),
      category,
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
    })
    reset()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus />
          Custom food
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add custom food</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="cf-name">Name</Label>
            <Input
              id="cf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Labneh"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as FoodCategory)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>{category}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-muted-foreground text-xs">
            Per 100g values:
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cf-cal">Calories</Label>
              <Input
                id="cf-cal"
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-pro">Protein (g)</Label>
              <Input
                id="cf-pro"
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-carb">Carbs (g)</Label>
              <Input
                id="cf-carb"
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-fat">Fat (g)</Label>
              <Input
                id="cf-fat"
                type="number"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!name.trim()}>
            Add food
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
