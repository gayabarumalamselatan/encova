import { allFeatures } from "@/lib/module.list";
import DashboardView from "@/views/dashboard/DashboardView";
import React from "react";

export const metadata = {
  title: `${allFeatures[0].title} | Asisgo Encova`,
  description: allFeatures[0].description,
};

const DashboardPage = () => {
  return <DashboardView />;
};

export default DashboardPage;
