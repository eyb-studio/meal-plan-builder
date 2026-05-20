import { Check, ChevronDown, Plus, Trash2, Users } from "lucide-react"
import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import type { Plan } from "~/lib/types"
import { cn } from "~/lib/utils"

type Props = {
  plans: Plan[]
  activePlanId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
}

export function PlansMenu({
  plans,
  activePlanId,
  onSelect,
  onCreate,
  onDelete,
}: Props) {
  const active = plans.find((p) => p.id === activePlanId)
  const activeName = active?.client.name.trim() || "Untitled client"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Users />
          <span className="max-w-[10rem] truncate">{activeName}</span>
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuLabel>Plans</DropdownMenuLabel>
        {plans.map((p) => {
          const isActive = p.id === activePlanId
          const name = p.client.name.trim() || "Untitled client"
          return (
            <DropdownMenuItem
              key={p.id}
              onSelect={() => onSelect(p.id)}
              className="flex items-center gap-2 pr-1"
            >
              <Check
                className={cn(
                  "size-3.5 shrink-0",
                  isActive ? "opacity-100" : "opacity-0"
                )}
              />
              <span className="min-w-0 flex-1 truncate">{name}</span>
              {plans.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onDelete(p.id)
                  }}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded p-1 transition-colors"
                  aria-label={`Delete plan for ${name}`}
                  title="Delete plan"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onCreate}>
          <Plus />
          New plan
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
