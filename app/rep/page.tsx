import Link from 'next/link';
import { loadCustomers } from '@/lib/customers/loadCustomers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon, ExternalLinkIcon } from '@radix-ui/react-icons';

export default async function RepPortalPage() {
  const customers = await loadCustomers();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-400">Rep Portal</p>
        <h1 className="text-4xl font-semibold text-foreground">Curated Presentation Workspace</h1>
        <p className="max-w-3xl text-base text-slate-600">
          Capture Dallas market selections, build working collections, and deliver export-ready presentations in minutes.
        </p>
      </div>
      <Tabs defaultValue="customers" className="w-full">
        <TabsList>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="promotion">Promotion</TabsTrigger>
          <TabsTrigger value="dallas">Dallas</TabsTrigger>
        </TabsList>
        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>Accounts</CardTitle>
              <CardDescription>Quickly jump into Dallas authoring or share the live customer presentation.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>City / Region</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{customer.name}</p>
                          <p className="text-sm text-slate-500">ID: {customer.id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-slate-600">
                          {[customer.city, customer.region].filter(Boolean).join(', ') || '—'}
                        </p>
                      </TableCell>
                      <TableCell className="flex items-center justify-end gap-3">
                        <Button asChild size="sm">
                          <Link href={`/rep/dallas?customer=${customer.id}`}>
                            Dallas <ArrowRightIcon className="ml-2 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/customers/${customer.slug ?? customer.id}?tab=dallas`}>
                            View site <ExternalLinkIcon className="ml-2 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="collections">
          <Card>
            <CardHeader>
              <CardTitle>Collections</CardTitle>
              <CardDescription>Coming soon: build thematic collections and share them across customers.</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
        <TabsContent value="promotion">
          <Card>
            <CardHeader>
              <CardTitle>Promotion Planning</CardTitle>
              <CardDescription>Track incentives, goals, and eligibility. This space will evolve with Dallas datasets.</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
        <TabsContent value="dallas">
          <Card>
            <CardHeader>
              <CardTitle>Dallas Market Tools</CardTitle>
              <CardDescription>Jump into authoring to capture the latest Dallas releases and push them live instantly.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/rep/dallas">
                  Open Dallas Authoring <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
