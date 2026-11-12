
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  ChartNoAxesCombined,
  Settings,
  Bell,
  TrendingUp,
  Wallet,
  CalendarDays,
  Search,
  UserRound,
  Activity,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { api } from "./services/api";

import type {
  MonthlySales,
  TopProduct,
  CategoryPerformance,
  RFM,
  SegmentSummary,
} from "./services/api";

import "./App.css";

type Period = "6M" | "12M" | "All";

interface Overview {
  total_revenue: number;
  total_orders: number;
  total_customers: number;
  gross_profit: number;
  profit_margin: number;
  average_order_value: number;
}

interface Retention {
  repeat_customers: number;
  repeat_rate: number;
  one_time_customers: number;
}

const segmentColors: Record<string, string> = {
  Champions: "#35c9a5",
  "Loyal Customers": "#5b9cff",
  "Potential Loyalists": "#a78bfa",
  Hibernating: "#8795a9",
  "Needs Attention": "#f5ad5c",
  "At Risk": "#e87979",
};

const categoryColors = [
  "#5b9cff",
  "#35c9a5",
  "#a78bfa",
  "#f5ad5c",
  "#e87979",
];

function getCollection<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (
    data !== null &&
    typeof data === "object" &&
    "value" in data &&
    Array.isArray((data as { value?: unknown }).value)
  ) {
    return (data as { value: T[] }).value;
  }

  return [];
}

function App() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [retention, setRetention] = useState<Retention | null>(null);

  const [sales, setSales] = useState<MonthlySales[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [categories, setCategories] = useState<CategoryPerformance[]>([]);
  const [customers, setCustomers] = useState<RFM[]>([]);
  const [segments, setSegments] = useState<SegmentSummary[]>([]);

  const [period, setPeriod] = useState<Period>("12M");
  const [customerSearch, setCustomerSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [
          overviewData,
          retentionData,
          salesData,
          productsData,
          categoriesData,
          rfmData,
          segmentsData,
        ] = await Promise.all([
          api.overview(),
          api.retention(),
          api.monthlySales(),
          api.topProducts(),
          api.categories(),
          api.rfm(),
          api.segments(),
        ]);

        setOverview(overviewData);
        setRetention(retentionData);

        setSales(getCollection<MonthlySales>(salesData));
        setTopProducts(getCollection<TopProduct>(productsData));
        setCategories(getCollection<CategoryPerformance>(categoriesData));
        setCustomers(getCollection<RFM>(rfmData));
        setSegments(getCollection<SegmentSummary>(segmentsData));
      } catch (err) {
        console.error("Dashboard loading failed:", err);
        setError(
          "Unable to load analytics. Please check your API connection."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const money = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number.isFinite(value) ? value : 0);

  const compactMoney = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(Number.isFinite(value) ? value : 0);

  const chartData = useMemo(() => {
    const safeSales = Array.isArray(sales) ? sales : [];

    const count =
      period === "6M"
        ? 6
        : period === "12M"
          ? 12
          : safeSales.length;

    return safeSales.slice(-count).map((item) => ({
      ...item,
      label: new Date(`${item.month}-01T00:00:00`).toLocaleDateString(
        "en-IN",
        { month: "short", year: "2-digit" }
      ),
    }));
  }, [sales, period]);

  const chartTotals = chartData.reduce(
    (totals, item) => ({
      revenue: totals.revenue + (Number(item.revenue) || 0),
      profit: totals.profit + (Number(item.profit) || 0),
    }),
    { revenue: 0, profit: 0 }
  );

  const filteredCustomers = useMemo(() => {
    const safeCustomers = Array.isArray(customers) ? customers : [];
    const query = customerSearch.trim().toLowerCase();

    return safeCustomers
      .filter((customer) => {
        const searchableText = [
          customer.customer_name,
          customer.city,
          customer.segment,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch = searchableText.includes(query);

        const matchesSegment =
          segmentFilter === "All" ||
          customer.segment === segmentFilter;

        return matchesSearch && matchesSegment;
      })
      .sort(
        (a, b) =>
          (Number(b.monetary) || 0) - (Number(a.monetary) || 0)
      );
  }, [customers, customerSearch, segmentFilter]);

  const metrics = overview
    ? [
        {
          label: "Total Revenue",
          value: money(overview.total_revenue),
          icon: Wallet,
          description: "Recorded business revenue",
        },
        {
          label: "Total Orders",
          value: overview.total_orders.toLocaleString("en-IN"),
          icon: ShoppingBag,
          description: "Processed transactions",
        },
        {
          label: "Total Customers",
          value: overview.total_customers.toLocaleString("en-IN"),
          icon: Users,
          description: "Unique customers",
        },
        {
          label: "Gross Profit",
          value: money(overview.gross_profit),
          icon: TrendingUp,
          description: `${overview.profit_margin.toFixed(2)}% profit margin`,
        },
      ]
    : [];

  const totalSegmentCustomers = segments.reduce(
    (sum, segment) => sum + (Number(segment.customer_count) || 0),
    0
  );

  const totalCategoryRevenue = categories.reduce(
    (sum, category) => sum + (Number(category.revenue) || 0),
    0
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">F</div>
          <span>FlowMetrics</span>
        </div>

        <p className="nav-heading">WORKSPACE</p>

        <nav>
          <a className="nav-link active" href="#">
            <LayoutDashboard size={19} />
            Overview
          </a>

          <a className="nav-link" href="#sales">
            <ChartNoAxesCombined size={19} />
            Sales Analytics
          </a>

          <a className="nav-link" href="#customer-intelligence">
            <Users size={19} />
            Customers
          </a>

          <a className="nav-link" href="#products">
            <ShoppingBag size={19} />
            Products
          </a>
        </nav>

        <div className="sidebar-bottom">
          <a className="nav-link" href="#settings">
            <Settings size={19} />
            Settings
          </a>

          <div className="profile">
            <div className="avatar">FM</div>
            <div>
              <strong>Business Admin</strong>
              <small>Workspace</small>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace / Overview</span>
            <h1>Business Overview</h1>
          </div>

          <button
            className="notification"
            aria-label="Notifications"
            type="button"
          >
            <Bell size={19} />
          </button>
        </header>

        <section className="welcome">
          <div>
            <p className="eyebrow">BUSINESS INTELLIGENCE</p>
            <h2>Your business, at a glance.</h2>
            <p>Track performance and discover what drives growth.</p>
          </div>

          <span className="live-status">API Connected</span>
        </section>

        {loading && (
          <p className="message">Loading business analytics...</p>
        )}

        {error && <p className="error-message">{error}</p>}

        {!loading && !error && overview && (
          <>
            <section className="metric-grid">
              {metrics.map((metric) => {
                const Icon = metric.icon;

                return (
                  <article className="metric-card" key={metric.label}>
                    <div className="metric-top">
                      <span>{metric.label}</span>
                      <Icon size={20} />
                    </div>

                    <strong>{metric.value}</strong>
                    <small>{metric.description}</small>
                  </article>
                );
              })}
            </section>

            <section className="chart-card" id="sales">
              <div className="chart-header">
                <div>
                  <div className="chart-title-row">
                    <h3>Revenue &amp; Profit</h3>
                    <span className="chart-live-dot" />
                  </div>

                  <p>Monthly financial performance</p>
                </div>

                <div className="chart-periods" aria-label="Chart period">
                  {(["6M", "12M", "All"] as Period[]).map((option) => (
                    <button
                      key={option}
                      className={period === option ? "selected" : ""}
                      onClick={() => setPeriod(option)}
                      type="button"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="chart-summary">
                <div>
                  <span className="summary-label">Revenue in period</span>
                  <strong>{money(chartTotals.revenue)}</strong>
                </div>

                <div>
                  <span className="summary-label">Profit in period</span>
                  <strong>{money(chartTotals.profit)}</strong>
                </div>

                <div className="chart-period-label">
                  <CalendarDays size={15} />
                  {chartData.length} months
                </div>
              </div>

              <div className="chart-legend">
                <span>
                  <i className="legend-dot revenue-dot" />
                  Revenue
                </span>

                <span>
                  <i className="legend-dot profit-dot" />
                  Profit
                </span>
              </div>

              {chartData.length > 0 ? (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{
                        top: 12,
                        right: 12,
                        left: 4,
                        bottom: 4,
                      }}
                    >
                      <CartesianGrid
                        stroke="#263244"
                        strokeDasharray="3 5"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#8995a8", fontSize: 11 }}
                        dy={10}
                      />

                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#8995a8", fontSize: 11 }}
                        tickFormatter={(value: number) =>
                          `₹${compactMoney(value)}`
                        }
                        width={72}
                      />

                      <Tooltip
                        contentStyle={{
                          background: "#151f2d",
                          border: "1px solid #2b394c",
                          borderRadius: "10px",
                          color: "#f1f5f9",
                          fontSize: "12px",
                        }}
                        labelStyle={{
                          color: "#aab7c8",
                          marginBottom: "6px",
                        }}
                        formatter={(value) => money(Number(value))}
                      />

                      <Line
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="#5b9cff"
                        strokeWidth={2.8}
                        dot={false}
                        activeDot={{
                          r: 5,
                          fill: "#5b9cff",
                          stroke: "#151f2d",
                          strokeWidth: 2,
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey="profit"
                        name="Profit"
                        stroke="#35c9a5"
                        strokeWidth={2.8}
                        dot={false}
                        activeDot={{
                          r: 5,
                          fill: "#35c9a5",
                          stroke: "#151f2d",
                          strokeWidth: 2,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="message">
                  No monthly sales data available.
                </p>
              )}
            </section>

            <section className="detail-grid">
              <article className="detail-card">
                <div className="section-heading">
                  <div>
                    <h3>Profitability</h3>
                    <p>Gross profit margin</p>
                  </div>

                  <TrendingUp size={20} />
                </div>

                <strong className="large-number">
                  {overview.profit_margin.toFixed(2)}%
                </strong>

                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, overview.profit_margin)
                      )}%`,
                    }}
                  />
                </div>

                <small>
                  Average order value:{" "}
                  {money(overview.average_order_value)}
                </small>
              </article>

              <article className="detail-card">
                <div className="section-heading">
                  <div>
                    <h3>Customer Retention</h3>
                    <p>Repeat purchase behaviour</p>
                  </div>

                  <Users size={20} />
                </div>

                {retention ? (
                  <>
                    <strong className="large-number">
                      {retention.repeat_rate.toFixed(2)}%
                    </strong>

                    <p className="detail-description">
                      Repeat purchase rate
                    </p>

                    <div className="retention-stats">
                      <span>
                        Repeat customers
                        <strong>{retention.repeat_customers}</strong>
                      </span>

                      <span>
                        One-time customers
                        <strong>{retention.one_time_customers}</strong>
                      </span>
                    </div>
                  </>
                ) : (
                  <p>Retention data unavailable.</p>
                )}
              </article>
            </section>

            <section className="performance-grid" id="products">
              <article className="performance-card">
                <div className="section-heading">
                  <div>
                    <h3>Top Performing Products</h3>
                    <p>Products ranked by revenue</p>
                  </div>

                  <ShoppingBag size={20} />
                </div>

                <div className="product-ranking">
                  {topProducts.map((product, index) => {
                    const maxRevenue = Math.max(
                      ...topProducts.map((item) => item.revenue),
                      1
                    );

                    return (
                      <div
                        className="product-ranking-item"
                        key={product.product}
                      >
                        <div className="product-ranking-header">
                          <span>
                            <b>{String(index + 1).padStart(2, "0")}</b>
                            {product.product}
                          </span>

                          <strong>{money(product.revenue)}</strong>
                        </div>

                        <div className="product-chart-track">
                          <div
                            className="product-chart-fill"
                            style={{
                              width: `${
                                (product.revenue / maxRevenue) * 100
                              }%`,
                            }}
                          />
                        </div>

                        <small>
                          {product.units_sold} units sold ·{" "}
                          {money(product.profit)} profit
                        </small>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="performance-card">
                <div className="section-heading">
                  <div>
                    <h3>Category Distribution</h3>
                    <p>Revenue contribution by category</p>
                  </div>

                  <ChartNoAxesCombined size={20} />
                </div>

                {categories.length > 0 ? (
                  <>
                    <div className="category-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categories}
                            dataKey="revenue"
                            nameKey="category"
                            innerRadius={67}
                            outerRadius={94}
                            paddingAngle={4}
                            stroke="none"
                          >
                            {categories.map((category, index) => (
                              <Cell
                                key={category.category}
                                fill={
                                  categoryColors[
                                    index % categoryColors.length
                                  ]
                                }
                              />
                            ))}
                          </Pie>

                          <Tooltip
                            formatter={(value) => money(Number(value))}
                            contentStyle={{
                              background: "#151f2d",
                              border: "1px solid #2b394c",
                              borderRadius: "10px",
                              color: "#f1f5f9",
                              fontSize: "12px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="category-center">
                        <strong>
                          {compactMoney(totalCategoryRevenue)}
                        </strong>
                        <span>Total revenue</span>
                      </div>
                    </div>

                    <div className="category-list">
                      {categories.map((category, index) => (
                        <div
                          className="category-row"
                          key={category.category}
                        >
                          <div>
                            <span
                              className="category-indicator"
                              style={{
                                background:
                                  categoryColors[
                                    index % categoryColors.length
                                  ],
                              }}
                            />

                            <span>{category.category}</span>
                          </div>

                          <strong>
                            {(
                              (category.revenue /
                                (totalCategoryRevenue || 1)) *
                              100
                            ).toFixed(1)}
                            %
                          </strong>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="message">No category data available.</p>
                )}
              </article>
            </section>

            <section
              className="customer-intelligence"
              id="customer-intelligence"
            >
              <div className="intelligence-heading">
                <div>
                  <p className="eyebrow">CUSTOMER ANALYTICS</p>
                  <h2>Customer Intelligence</h2>
                  <p>
                    Understand customer value, loyalty and churn risk.
                  </p>
                </div>

                <span className="customer-count">
                  {customers.length} customers analysed
                </span>
              </div>

              <div className="intelligence-grid">
                <article className="performance-card segment-card">
                  <div className="section-heading">
                    <div>
                      <h3>Customer Segments</h3>
                      <p>RFM-based customer distribution</p>
                    </div>

                    <Users size={20} />
                  </div>

                  {segments.length > 0 ? (
                    <>
                      <div className="segment-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={segments}
                            layout="vertical"
                            margin={{
                              top: 5,
                              right: 15,
                              left: 5,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid
                              stroke="#263244"
                              strokeDasharray="3 5"
                              horizontal={false}
                            />

                            <XAxis
                              type="number"
                              axisLine={false}
                              tickLine={false}
                              tick={{
                                fill: "#8995a8",
                                fontSize: 10,
                              }}
                            />

                            <YAxis
                              type="category"
                              dataKey="segment"
                              axisLine={false}
                              tickLine={false}
                              tick={{
                                fill: "#b5c0d0",
                                fontSize: 10,
                              }}
                              width={125}
                            />

                            <Tooltip
                              contentStyle={{
                                background: "#151f2d",
                                border: "1px solid #2b394c",
                                borderRadius: "10px",
                                color: "#f1f5f9",
                                fontSize: "12px",
                              }}
                              formatter={(value) => [
                                `${value} customers`,
                                "Customers",
                              ]}
                            />

                            <Bar
                              dataKey="customer_count"
                              name="Customers"
                              radius={[0, 5, 5, 0]}
                              barSize={19}
                            >
                              {segments.map((segment) => (
                                <Cell
                                  key={segment.segment}
                                  fill={
                                    segmentColors[segment.segment] ??
                                    "#5b9cff"
                                  }
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="segment-summary-list">
                        {segments.map((segment) => (
                          <div
                            className="segment-summary-row"
                            key={segment.segment}
                          >
                            <div>
                              <span
                                className="segment-indicator"
                                style={{
                                  background:
                                    segmentColors[segment.segment] ??
                                    "#5b9cff",
                                }}
                              />

                              <span>{segment.segment}</span>
                            </div>

                            <strong>{segment.customer_count}</strong>

                            <span>{money(segment.total_revenue)}</span>
                          </div>
                        ))}
                      </div>

                      <p className="customer-table-note">
                        {totalSegmentCustomers} customers across{" "}
                        {segments.length} segments
                      </p>
                    </>
                  ) : (
                    <p className="message">
                      No segment data available.
                    </p>
                  )}
                </article>

                <article className="performance-card customer-explorer">
                  <div className="section-heading">
                    <div>
                      <h3>Customer Explorer</h3>
                      <p>Ranked by customer monetary value</p>
                    </div>

                    <UserRound size={20} />
                  </div>

                  <div className="customer-search">
                    <Search size={17} />

                    <input
                      type="search"
                      value={customerSearch}
                      onChange={(event) =>
                        setCustomerSearch(event.target.value)
                      }
                      placeholder="Search name, city or segment..."
                      aria-label="Search customers"
                    />
                  </div>

                  <div className="customer-filter">
                    <Activity size={15} />

                    <select
                      value={segmentFilter}
                      onChange={(event) =>
                        setSegmentFilter(event.target.value)
                      }
                      aria-label="Filter by customer segment"
                    >
                      <option value="All">All segments</option>

                      {segments.map((segment) => (
                        <option
                          key={segment.segment}
                          value={segment.segment}
                        >
                          {segment.segment}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="customer-table-wrap">
                    <table className="customer-table">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Segment</th>
                          <th>Orders</th>
                          <th>Value</th>
                          <th>RFM</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredCustomers.map((customer) => (
                          <tr key={customer.customer_id}>
                            <td>
                              <div className="customer-identity">
                                <strong>{customer.customer_name}</strong>
                                <span>{customer.city}</span>
                              </div>
                            </td>

                            <td>
                              <span
                                className="segment-pill"
                                style={{
                                  color:
                                    segmentColors[customer.segment] ??
                                    "#aab6c7",
                                }}
                              >
                                {customer.segment}
                              </span>
                            </td>

                            <td>{customer.frequency}</td>

                            <td className="customer-value">
                              {money(customer.monetary)}
                            </td>

                            <td>
                              <span className="rfm-score">
                                {customer.RFM_score}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {filteredCustomers.length === 0 && (
                      <p className="message">
                        No matching customers found.
                      </p>
                    )}
                  </div>

                  <p className="customer-table-note">
                    Showing {filteredCustomers.length} of{" "}
                    {customers.length} customers
                  </p>
                </article>
              </div>
            </section>

            <section className="footer-note">
              <span>FLOWMETRICS ANALYTICS ENGINE</span>
              <span>Data from your connected SQLite database</span>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
