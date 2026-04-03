import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" /> {/* Title */}
        <Skeleton className="h-10 w-32 rounded-lg" /> {/* Button */}
      </div>

      <div className="bg-card rounded-xl shadow-sm overflow-hidden overflow-x-auto w-full border border-border">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              {["Quiz", "Date", "Participants", "Action"].map((header) => (
                <th
                  key={header}
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Skeleton className="h-4 w-32" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Skeleton className="h-4 w-12" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <Skeleton className="h-8 w-24 ml-auto rounded-md" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
