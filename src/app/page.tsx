import { HydrateClient, api } from "@/trpc/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Home() {
  return (
    <HydrateClient>
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Welcome to Our App</h1>
            <p className="text-muted-foreground">
              Get started by signing in to your account
            </p>
          </div>
          <div className="flex flex-col space-y-4">
            <Button asChild size="lg" className="w-full">
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/auth/signup">Create Account</Link>
            </Button>
          </div>
        </div>
      </div>
    </HydrateClient>
  );
}
