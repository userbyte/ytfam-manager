import { Suspense } from "react";
import { Metadata } from "next";
import { getFamily } from "../utils/db";
import FamilyOverview from "../components/FamilyOverview";
import QueryClientProviderWrapper from "../components/QueryClientProviderWrapper";
import styles from "@/app/style/module/FamilyOverviewPage.module.css";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}): Promise<Metadata> {
  const defaultMetadata = {
    title: "ytfam-manager",
    description: "Family overview page",
  };
  const code = (await searchParams).code;
  if (!code) {
    return defaultMetadata;
  }
  let isFullCode = false;
  if (code.includes("_")) {
    isFullCode = true;
  }

  // get family
  let family;
  if (isFullCode) {
    family = await getFamily({ full_code: code });
  } else {
    family = await getFamily({ family_code: code });
  }

  if (family === "DB_ERROR" || family === null || family === undefined) {
    return defaultMetadata;
  } else {
    return {
      title: `Family: ${family.name}`,
      description: `${family.members.length} members`,
      openGraph: {
        siteName: `ytfam-manager`,
        title: `Family: ${family.name}`,
        description: `${family.members.length} members`,
        images: [
          {
            url: "https://ytmgr.userbyte.xyz/img/png/logo.png",
            width: 175,
            height: 175,
          },
        ],
      },
      twitter: {
        // image too big on discord embed, so we unset
        images: [],
      },
    };
  }
}

export default function FamilyOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  return (
    <div className={styles.main}>
      <Suspense>
        <QueryClientProviderWrapper>
          <FamilyOverview searchParams_={searchParams} />
        </QueryClientProviderWrapper>
      </Suspense>
    </div>
  );
}
