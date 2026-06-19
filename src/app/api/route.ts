// API Route:
// /api
// Supported methods: GET

import getConfig from "next/config";
import { NextResponse } from "next/server";

const { publicRuntimeConfig } = getConfig();

// GET /api
// returns some info about the api
export async function GET() {
  const version = publicRuntimeConfig?.version;
  return NextResponse.json({
    name: "ytfam-manager API",
    api_version: version,
  });
}
