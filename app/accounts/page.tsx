import React from "react";
import AccountManagement from "@/views/accounts/AccountManagement";
import { allFeatures } from "@/lib/module.list";

export const metadata = {
  title: `${allFeatures[6].title} | Asisgo Encova`,
  description: allFeatures[6].description,
};

export default function AccountsPage() {
  return <AccountManagement />;
}
