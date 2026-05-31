import { PageHeader } from "@/components/PageHeader";
import { ProductenManager } from "@/components/admin/ProductenManager";
import { requireAdmin } from "@/lib/auth";
import { getProducts } from "@/lib/data";

export default async function ProductenPage() {
  await requireAdmin();
  const products = await getProducts(true);

  return (
    <div>
      <PageHeader
        title="Producten"
        subtitle="Beheer producten en prijzen. Prijzen worden gebruikt voor de kostenberekening."
      />
      <ProductenManager products={products} />
    </div>
  );
}
