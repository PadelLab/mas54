"use client";

import { useState } from "react";
import { CreateNewUserForm } from "./create-new-user-form";
import { NewUserPageHeader } from "./new-user-page-header";
import type { NewUserSource } from "./new-user-source";

export function NewUserCreateView({ source }: { source?: NewUserSource }) {
  const [created, setCreated] = useState(false);

  return (
    <div className="space-y-4">
      <NewUserPageHeader source={source} hideHeading={created} />
      <CreateNewUserForm source={source} onCreated={() => setCreated(true)} />
    </div>
  );
}
