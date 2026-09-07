import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../../services/api';
import Card, { CardBody, CardHeader, CardTitle } from '../../components/Card';
import SearchBar from '../../components/SearchBar';
import {
  Package,
  Layers,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Tag,
  Boxes,
} from 'lucide-react';

const FinanceInventory = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await getProducts();
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  // Calculate metrics
  const inventoryMetrics = useMemo(() => {
    let totalCostVal = 0;
    let totalRetailVal = 0;
    let totalUnits = 0;
    const categoryMap = {};

    products.forEach((p) => {
      const stock = Number(p.stock || 0);
      const origPrice = Number(p.originalPrice || 0);
      const retailPrice = Number(p.retailPrice || p.websitePrice || origPrice || 0);
      const costVal = stock * origPrice;
      const retailVal = stock * retailPrice;

      totalCostVal += costVal;
      totalRetailVal += retailVal;
      totalUnits += stock;

      const catName = p.category?.name || (typeof p.category === 'string' ? p.category : 'Uncategorized');
      if (!categoryMap[catName]) {
        categoryMap[catName] = { name: catName, costVal: 0, units: 0, skus: 0 };
      }
      categoryMap[catName].costVal += costVal;
      categoryMap[catName].units += stock;
      categoryMap[catName].skus += 1;
    });

    const categoryBreakdown = Object.values(categoryMap).sort((a, b) => b.costVal - a.costVal);

    return {
      totalCostVal,
      totalRetailVal,
      totalUnits,
      potentialGrossMargin: totalRetailVal - totalCostVal,
      categories: categoryBreakdown,
    };
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const catName = p.category?.name || (typeof p.category === 'string' ? p.category : 'Uncategorized');
      const matchesCat = selectedCategory === 'all' || catName === selectedCategory;
      const matchesSearch =
        !search.trim() ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.model?.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.includes(search);
      return matchesCat && matchesSearch;
    });
  }, [products, search, selectedCategory]);

  const formatCur = (v) => `Rs. ${Number(v || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Top Banner & Insight */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
              Whole Stock Worth (Available Qty × Original Purchase Price)
            </span>
            <h2 className="text-3xl font-black mt-1">
              {formatCur(inventoryMetrics.totalCostVal)}
            </h2>
            <p className="text-xs text-emerald-100 mt-1">
              Based on {products.length} live SKUs and {inventoryMetrics.totalUnits.toLocaleString()} active units
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-xs space-y-1.5 min-w-[240px]">
            <div className="flex justify-between">
              <span className="text-emerald-100">Potential Retail Worth:</span>
              <span className="font-bold">{formatCur(inventoryMetrics.totalRetailVal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-100">Potential Gross Profit:</span>
              <span className="font-bold text-emerald-200">{formatCur(inventoryMetrics.potentialGrossMargin)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Accounting Clarification Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm">Asset Preservation in Accounting</p>
          <p className="mt-0.5 text-blue-800 leading-relaxed">
            Inventory is a primary current asset. When you purchase Rs. 50,000 worth of stock, cash decreases by Rs. 50,000 while stock increases by Rs. 50,000.
            Your business net worth remains completely steady until that inventory is sold at a profit or written off.
          </p>
        </div>
      </div>

      {/* Categories Valuation Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-500" />
          Stock Valuation by Category
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {inventoryMetrics.categories.slice(0, 8).map((cat) => (
            <div
              key={cat.name}
              onClick={() => setSelectedCategory(selectedCategory === cat.name ? 'all' : cat.name)}
              className={`p-3 rounded-lg border transition cursor-pointer ${
                selectedCategory === cat.name
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <p className="font-semibold text-xs text-slate-800 truncate">{cat.name}</p>
              <p className="text-sm font-bold text-emerald-700 mt-1">{formatCur(cat.costVal)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {cat.units} units across {cat.skus} SKUs
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search product name, model, barcode..."
            />
            {selectedCategory !== 'all' && (
              <button
                onClick={() => setSelectedCategory('all')}
                className="text-xs text-blue-600 hover:underline font-medium whitespace-nowrap"
              >
                Clear filter ({selectedCategory})
              </button>
            )}
          </div>
          <span className="text-xs text-slate-500 whitespace-nowrap">
            Showing {filteredProducts.length} of {products.length} products
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Product / SKU</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Available Qty</th>
                <th className="px-4 py-3 text-right">Original Cost Price</th>
                <th className="px-4 py-3 text-right">Sale Price</th>
                <th className="px-4 py-3 text-right">Total Stock Value</th>
                <th className="px-4 py-3 text-right">Expected Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="text-center py-6 text-slate-400">
                    Loading inventory valuations...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-6 text-slate-400">
                    No products matched your search.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const stock = Number(prod.stock || 0);
                  const origPrice = Number(prod.originalPrice || 0);
                  const retailPrice = Number(prod.retailPrice || prod.websitePrice || origPrice || 0);
                  const totalVal = stock * origPrice;
                  const totalRetail = stock * retailPrice;
                  const catName =
                    prod.category?.name || (typeof prod.category === 'string' ? prod.category : '-');

                  return (
                    <tr key={prod._id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{prod.name}</p>
                        {prod.model && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Model: {prod.model}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{catName}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            stock <= 5 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800">
                        {formatCur(origPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-500">
                        {formatCur(retailPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold font-mono text-emerald-700 text-sm">
                        {formatCur(totalVal)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600 text-xs">
                        +{formatCur(Math.max(0, totalRetail - totalVal))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinanceInventory;

