import { allFeatures } from "@/lib/module.list";
import Video from "@/views/video-compress/Video";
import React from "react";

export const metadata = {
  title: `${allFeatures[3].title} | Asisgo Encova`,
  description: allFeatures[3].description,
};

const page = () => {
  return <Video />;
};

export default page;
