import { allFeatures } from "@/lib/module.list";
import Compress from "@/views/file-compress/Compress";
import React from "react";

export const metadata = {
  title: `${allFeatures[2].title} | Asisgo Encova`,
  description: allFeatures[2].description,
};

const page = () => {
  return <Compress />;
};

export default page;
