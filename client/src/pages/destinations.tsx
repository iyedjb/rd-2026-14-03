import { useState } from "react";
import { DestinationList } from "@/components/destinations/destination-list";
import { DestinationForm } from "@/components/destinations/destination-form";
import { type Destination } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export default function Destinations() {
  const { userRole } = useAuth();
  const isVadmin = userRole === "vadmin";
  const [showForm, setShowForm] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | undefined>();

  const handleAdd = () => {
    setEditingDestination(undefined);
    setShowForm(true);
  };

  const handleEdit = (destination: Destination) => {
    setEditingDestination(destination);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingDestination(undefined);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingDestination(undefined);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Destinos</h2>
        <p className="text-muted-foreground">
          Gerencie os destinos disponíveis para seleção nos clientes
        </p>
      </div>

      {showForm ? (
        <DestinationForm
          destination={editingDestination}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      ) : (
        <DestinationList onAdd={handleAdd} onEdit={handleEdit} isVadmin={isVadmin} />
      )}
    </div>
  );
}