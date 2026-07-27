import { allFeatures } from "@/lib/module.list";
import Encode from "@/views/cctv-encode/Encode";
import React from "react";

export const metadata = {
  title: `${allFeatures[1].title} | Asisgo Encova`,
  description: allFeatures[1].description,
};

const page = () => {
  return <Encode />;
};

export default page;
