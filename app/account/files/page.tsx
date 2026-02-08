import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import FileLibrary from "@/components/account/FileLibrary";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function FilesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link href="/account">
              <Button variant="ghost" size="icon" className="-ml-2">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6" /> Reference Files
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <FileLibrary userId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
