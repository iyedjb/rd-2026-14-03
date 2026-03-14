import { useState } from "react";
import { BusList } from "@/components/buses/bus-list";
import { BusForm } from "@/components/buses/bus-form";
import { BusOccupancy } from "@/components/buses/bus-occupancy";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Bus } from "@shared/schema";
import { Bus as BusIcon, Users } from "lucide-react";

export default function Buses() {
  const [showForm, setShowForm] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | undefined>();
  const [activeTab, setActiveTab] = useState("list");

  const handleAdd = () => {
    setEditingBus(undefined);
    setShowForm(true);
  };

  const handleEdit = (bus: Bus) => {
    setEditingBus(bus);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingBus(undefined);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingBus(undefined);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Descrição de Ônibus</h2>
        <p className="text-muted-foreground">
          Gerencie os tipos de ônibus e visualize a ocupação
        </p>
      </div>

      {showForm ? (
        <BusForm
          bus={editingBus}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="list" data-testid="tab-bus-list">
              <BusIcon className="h-4 w-4 mr-2" />
              Lista de Ônibus
            </TabsTrigger>
            <TabsTrigger value="occupancy" data-testid="tab-bus-occupancy">
              <Users className="h-4 w-4 mr-2" />
              Ocupação
            </TabsTrigger>
          </TabsList>
          <TabsContent value="list">
            <BusList onAdd={handleAdd} onEdit={handleEdit} />
          </TabsContent>
          <TabsContent value="occupancy">
            <BusOccupancy />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

