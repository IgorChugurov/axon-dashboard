import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="bg-primary-foreground rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">
          Select из кастомного регистра
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Выберите фрукт:
            </label>
            <Select>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Выберите фрукт" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apple">Яблоко</SelectItem>
                <SelectItem value="banana">Банан</SelectItem>
                <SelectItem value="orange">Апельсин</SelectItem>
                <SelectItem value="grape">Виноград</SelectItem>
                <SelectItem value="strawberry">Клубника</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4">
        <div className="bg-primary-foreground rounded-lg p-4 lg:col-span-2 xl:col-span-1 2xl:col-span-2">
          Card 1
        </div>
        <div className="bg-primary-foreground rounded-lg p-4">Card 2</div>
        <div className="bg-primary-foreground rounded-lg p-4">Card 3</div>
        <div className="bg-primary-foreground rounded-lg p-4">Card 4</div>
        <div className="bg-primary-foreground rounded-lg p-4 lg:col-span-2 xl:col-span-1 2xl:col-span-2">
          Card 5
        </div>
        <div className="bg-primary-foreground rounded-lg p-4">Card 6</div>
      </div>
    </div>
  );
}
