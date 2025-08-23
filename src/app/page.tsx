import { Button } from "@/components/ui/button";
import prisma from "@/lib/db";

const Page = async () => {

  return (
    <div>
      <Button variant="destructive">Click me</Button>
    </div>
  );
};

export default Page;  