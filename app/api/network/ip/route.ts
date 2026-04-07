import { NextResponse } from "next/server";
import os from "os";

export async function GET() {
  try {
    const interfaces = os.networkInterfaces();
    const adapters = [];

    for (const name of Object.keys(interfaces)) {
      if (!interfaces[name]) continue;
      for (const iface of interfaces[name]) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (iface.family === "IPv4" && !iface.internal) {
          adapters.push({
            name,
            ip: iface.address
          });
        }
      }
    }

    return NextResponse.json({ adapters, ip: adapters.length > 0 ? adapters[0].ip : "127.0.0.1" });
  } catch (error) {
    return NextResponse.json({ adapters: [], ip: "127.0.0.1" });
  }
}
