import { Button } from "@/components/ui/button";
import { trpc,getQueryClient } from "@/trpc/server";
import { dehydrate, HydrationBoundary} from "@tanstack/react-query";
import { Client } from "./client";
import { Suspense } from "react";
const Page = async () => {

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.chatai.queryOptions({text: "Hello"}));
  const dehydratedState = dehydrate(queryClient);
 
  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={<div>Loading...</div>}>
        <Client />
      </Suspense>
    </HydrationBoundary>
  );
};

export default Page;  