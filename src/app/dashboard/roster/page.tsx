import { Placeholder } from "@/components/placeholder";

export const metadata = { title: "My Roster" };

export default function RosterPage() {
  return (
    <Placeholder
      title="My Roster"
      milestone="M4"
      description="Persistent chapter roster. Add athletes with name, age, belt rank, height, weight, and ID number; division is computed automatically from age and weight."
    />
  );
}