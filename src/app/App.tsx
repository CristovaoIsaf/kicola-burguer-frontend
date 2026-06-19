import { useState, useEffect, useCallback, useRef } from "react";
import {
  ShoppingCart, Search, Menu, X, Star, ChevronRight, Plus, Minus,
  Trash2, MapPin, Phone, Mail, Clock, Check, ArrowRight, TrendingUp,
  Users, Package, DollarSign, BarChart2, LogOut, ChevronDown, Edit,
  Truck, Tag, UserCheck, Download, Bell, Home, Grid, FileText,
  Shield, Eye, User, ChevronLeft, Flame, Instagram, Facebook, Twitter,
  Loader2, AlertCircle, RefreshCw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES — espelham exactamente os DTOs do backend
// ─────────────────────────────────────────────────────────────────────────────
type AppPage = "home" | "catalog" | "product" | "cart" | "checkout" | "login" | "register" | "forgot" | "profile" | "tracking" | "admin";
type AdminPage = "dashboard" | "products" | "categories" | "orders" | "customers" | "employees" | "coupons" | "permissions" | "analytics" | "reports";
type CheckoutStep = 1 | 2 | 3 | 4;
type StatusPedido = "PENDENTE" | "CONFIRMADO" | "EM_PREPARACAO" | "PRONTO" | "EM_ENTREGA" | "ENTREGUE" | "CANCELADO";

// — DTOs de resposta (snake_case→camelCase mapeados pelo Jackson) —
interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  userId: string;
  nome: string;
  email: string;
  role: "ADMIN" | "FUNCIONARIO" | "CLIENTE";
}

interface ProdutoResponse {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  categoriaId: string;
  categoriaNome: string;
  imagemUrl: string;
  disponivel: boolean;
  quantidadeEstoque: number;
  estoqueMinimo: number;
  estoqueBaixo: boolean;
  criadoEm?: string;
}

interface CategoriaResponse {
  id: string;
  nome: string;
  descricao: string;
  imagemUrl: string;
  ativo: boolean;
  totalProdutos: number;
}

interface CarrinhoItemResponse {
  id: string;
  produtoId: string;
  nomeProduto: string;
  imagemUrl: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

interface CarrinhoResponse {
  id: string;
  itens: CarrinhoItemResponse[];
  total: number;
  quantidadeItens: number;
}

interface EnderecoResponse {
  id: string;
  rua: string;
  bairro: string;
  cidade: string;
  referencia: string;
  latitude: number | null;
  longitude: number | null;
  principal: boolean;
}

interface PedidoItemResponse {
  id: string;
  produtoId: string;
  nomeProduto: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

interface PedidoResponse {
  id: string;
  numeroPedido: string;
  usuarioId: string;
  usuarioNome: string;
  status: StatusPedido;
  itens: PedidoItemResponse[];
  subtotal: number;
  taxaEntrega: number;
  desconto: number;
  total: number;
  cupomCodigo: string | null;
  observacao: string | null;
  metodoPagamento: string;
  statusPagamento: string;
  enderecoEntrega: EnderecoResponse | null;
  criadoEm: string;
  atualizadoEm: string;
}

interface CupomResponse {
  id: string;
  codigo: string;
  descricao: string;
  tipoDesconto: "PERCENTUAL" | "VALOR_FIXO";
  valor: number;
  valorMinimoPedido: number | null;
  dataInicio: string;
  dataExpiracao: string;
  limiteUtilizacao: number | null;
  totalUtilizado: number;
  ativo: boolean;
  valido: boolean;
}

interface DashboardResponse {
  totalVendasHoje: number;
  totalVendasMes: number;
  pedidosHoje: number;
  pedidosMes: number;
  ticketMedio: number;
  clientesAtivos: number;
  produtosMaisVendidos: { id: string; nome: string; totalVendido: number }[];
  receitaMensal: Record<number, number>;
}

// Frontend composite type (produto enriquecido com campos de UI)
interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  badge?: string;
  rating: number;
  reviews: number;
  ingredients?: string[];
}

interface CartItem { product: Product; quantity: number; carrinhoItemId?: string; }

interface AuthUser {
  userId: string;
  nome: string;
  email: string;
  role: "ADMIN" | "FUNCIONARIO" | "CLIENTE";
}

// ─────────────────────────────────────────────────────────────────────────────
// DADOS ESTÁTICOS (fallback e dados de UI sem endpoint)
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_PRODUCTS: Product[] = [
  { id: "static-1", name: "Kikola Classic", category: "burgers", price: 2500, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop&auto=format", description: "O nosso clássico artesanal com carne bovina 200g, alface fresca, tomate, cebola caramelizada e molho especial Kikola.", badge: "Mais Vendido", rating: 4.9, reviews: 342, ingredients: ["Carne bovina 200g", "Pão brioche artesanal", "Alface", "Tomate", "Cebola caramelizada", "Molho especial Kikola", "Queijo cheddar"] },
  { id: "static-2", name: "Kikola Double Stack", category: "burgers", price: 3500, image: "https://images.unsplash.com/photo-1586816001966-79b736744398?w=600&h=400&fit=crop&auto=format", description: "Dupla dose de carne bovina, duplo queijo, bacon crocante e o irresistível molho BBQ.", badge: "Novo", rating: 4.8, reviews: 187, ingredients: ["Carne bovina 2x200g", "Pão brioche", "Queijo cheddar duplo", "Bacon", "Molho BBQ"] },
  { id: "static-3", name: "Spicy Kikola", category: "burgers", price: 2800, image: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&h=400&fit=crop&auto=format", description: "Para os amantes de picante.", rating: 4.7, reviews: 156 },
  { id: "static-4", name: "Batata Kikola", category: "sides", price: 1200, image: "https://images.unsplash.com/photo-1630384060421-cb20aebbd956?w=600&h=400&fit=crop&auto=format", description: "Batatas fritas crocantes temperadas.", rating: 4.9, reviews: 412 },
  { id: "static-5", name: "Refrigerante 500ml", category: "drinks", price: 600, image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&h=400&fit=crop&auto=format", description: "Coca-Cola, Sprite, Fanta ou água.", rating: 4.5, reviews: 567 },
  { id: "static-6", name: "Combo Kikola Solo", category: "combos", price: 3800, image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&h=400&fit=crop&auto=format", description: "Kikola Classic + Batata + Bebida.", badge: "Mais Vendido", rating: 4.8, reviews: 298 },
];

const STATIC_CATEGORIES = [
  { id: "all", label: "Todos", icon: "🍽️" },
  { id: "burgers", label: "Hambúrgueres", icon: "🍔" },
  { id: "hotdogs", label: "Cachorros", icon: "🌭" },
  { id: "fahitas", label: "Fahitas", icon: "🌯" },
  { id: "combos", label: "Combos", icon: "🎯" },
  { id: "sides", label: "Batatas", icon: "🍟" },
  { id: "drinks", label: "Bebidas", icon: "🥤" },
];

// Mapeamento nome de categoria da API → id local de filtro
const CAT_MAP: Record<string, string> = {
  "Hambúrgueres": "burgers", "Cachorros": "hotdogs", "Fahitas": "fahitas",
  "Combos": "combos", "Batatas": "sides", "Bebidas": "drinks", "Sobremesas": "desserts",
};

const SALES_DATA = [
  { day: "Seg", vendas: 45000, pedidos: 18 }, { day: "Ter", vendas: 52000, pedidos: 22 },
  { day: "Qua", vendas: 38000, pedidos: 15 }, { day: "Qui", vendas: 67000, pedidos: 28 },
  { day: "Sex", vendas: 89000, pedidos: 38 }, { day: "Sáb", vendas: 125000, pedidos: 52 },
  { day: "Dom", vendas: 98000, pedidos: 41 },
];
const PIE_DATA = [
  { name: "Hambúrgueres", value: 45, color: "#E8001A" }, { name: "Combos", value: 25, color: "#FFCC00" },
  { name: "Batatas", value: 15, color: "#FF6B35" }, { name: "Bebidas", value: 10, color: "#4CAF50" },
  { name: "Outros", value: 5, color: "#9E9E9E" },
];

// ─────────────────────────────────────────────────────────────────────────────
// CAMADA HTTP — cliente centralizado
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const http = {
  _token: () => localStorage.getItem("kb_access_token"),

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = http._token();
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });

    if (res.status === 204) return null as T;

    let body: any;
    try { body = await res.json(); } catch { body = {}; }

    if (!res.ok) {
      // Suporta tanto ApiResponse { error: { message } } como erros directos
      const msg = body?.error?.message ?? body?.detail ?? body?.message ?? body?.error ?? `Erro ${res.status}`;
      throw new ApiError(res.status, msg);
    }

    // Unwrap ApiResponse<T> { success: true, data: T } se presente
    // Os endpoints de auth retornam directamente sem wrapper
    if (body && typeof body === "object" && "success" in body && "data" in body) {
      return body.data as T;
    }
    return body as T;
  },

  get<T>(path: string) { return http.request<T>(path, { method: "GET" }); },
  post<T>(path: string, data?: unknown) { return http.request<T>(path, { method: "POST", body: JSON.stringify(data) }); },
  put<T>(path: string, data?: unknown) { return http.request<T>(path, { method: "PUT", body: JSON.stringify(data) }); },
  patch<T>(path: string, data?: unknown) { return http.request<T>(path, { method: "PATCH", body: JSON.stringify(data) }); },
  delete<T>(path: string) { return http.request<T>(path, { method: "DELETE" }); },
};

// Paginação genérica do Spring (renomeada para evitar conflito com AppPage)
interface SpringPage<T> { content: T[]; totalElements: number; totalPages: number; number: number; }

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (v: number) => `${Number(v).toLocaleString("pt-AO")} Kz`;
const initials = (name: string) => name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

function mapProduto(p: ProdutoResponse): Product {
  return {
    id: p.id, name: p.nome, description: p.descricao ?? "",
    price: Number(p.preco),
    category: CAT_MAP[p.categoriaNome] ?? "burgers",
    image: p.imagemUrl || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop&auto=format",
    rating: 4.8, reviews: 120,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES UTILITÁRIOS
// ─────────────────────────────────────────────────────────────────────────────
function Spinner({ size = 18 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin" />;
}

function Toast({ message, type, onClose }: { message: string; type: "success" | "error" | "info"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const colors: Record<string, string> = { success: "bg-green-600", error: "bg-[#E8001A]", info: "bg-blue-600" };
  return (
    <div className={`fixed bottom-6 right-6 z-[999] flex items-center gap-3 ${colors[type]} text-white px-5 py-3.5 rounded-2xl shadow-2xl max-w-sm text-sm font-semibold`}>
      {type === "error" ? <AlertCircle size={16} /> : <Check size={16} />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDENTE: "bg-blue-500/20 text-blue-400",
    CONFIRMADO: "bg-yellow-500/20 text-yellow-400",
    EM_PREPARACAO: "bg-orange-500/20 text-orange-400",
    PRONTO: "bg-purple-500/20 text-purple-400",
    EM_ENTREGA: "bg-indigo-500/20 text-indigo-400",
    ENTREGUE: "bg-green-500/20 text-green-400",
    CANCELADO: "bg-red-500/20 text-red-400",
    ativo: "bg-green-500/20 text-green-400",
    inativo: "bg-white/10 text-white/40",
    vip: "bg-yellow-500/20 text-yellow-400",
    recebido: "bg-blue-500/20 text-blue-400",
    preparando: "bg-yellow-500/20 text-yellow-400",
    entregue: "bg-green-500/20 text-green-400",
    cancelado: "bg-red-500/20 text-red-400",
  };
  const labels: Record<string, string> = {
    PENDENTE: "Pendente", CONFIRMADO: "Confirmado", EM_PREPARACAO: "Em Preparação",
    PRONTO: "Pronto", EM_ENTREGA: "Em Entrega", ENTREGUE: "Entregue", CANCELADO: "Cancelado",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${map[status] ?? "bg-white/10 text-white/40"}`}>
      {labels[status] ?? status}
    </span>
  );
}

function ProductCard({ product, onAdd, onView, loading }: { product: Product; onAdd: (p: Product) => void; onView: (p: Product) => void; loading?: boolean }) {
  return (
    <div className="bg-[#161616] border border-white/5 rounded-2xl overflow-hidden hover:border-[#E8001A]/40 transition-all group">
      <div className="relative h-48 bg-[#1C1C1C] overflow-hidden">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {product.badge && (
          <span className="absolute top-3 left-3 bg-[#E8001A] text-white text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wide">{product.badge}</span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between mb-1.5">
          <h3 className="text-white font-bold leading-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1.05rem" }}>{product.name}</h3>
          <div className="flex items-center gap-1 text-[#FFCC00] shrink-0 ml-2">
            <Star size={12} fill="currentColor" />
            <span className="text-white text-xs">{product.rating}</span>
          </div>
        </div>
        <p className="text-white/45 text-xs mb-4 leading-relaxed line-clamp-2">{product.description}</p>
        <div className="flex items-center justify-between">
          <p className="text-[#FFCC00] font-black text-xl" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{fmt(product.price)}</p>
          <div className="flex gap-2">
            <button onClick={() => onView(product)} className="w-9 h-9 border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:border-white/30 hover:text-white transition-colors">
              <Eye size={14} />
            </button>
            <button onClick={() => onAdd(product)} disabled={loading} className="w-9 h-9 bg-[#E8001A] hover:bg-[#C4001A] text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-60">
              {loading ? <Spinner size={14} /> : <Plus size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  // ── navegação ──
  const [page, setPage] = useState<AppPage>("home");
  const [adminPage, setAdminPage] = useState<AdminPage>("dashboard");
  const [selectedProduct, setSelectedProduct] = useState<Product>(FALLBACK_PRODUCTS[0]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── dados da API ──
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [apiCategories, setApiCategories] = useState<CategoriaResponse[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<PedidoResponse | null>(null);
  const [myOrders, setMyOrders] = useState<PedidoResponse[]>([]);
  const [enderecos, setEnderecos] = useState<EnderecoResponse[]>([]);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [adminProducts, setAdminProducts] = useState<ProdutoResponse[]>([]);
  const [adminOrders, setAdminOrders] = useState<PedidoResponse[]>([]);

  // ── auth ──
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("kb_user");
    return stored ? JSON.parse(stored) : null;
  });

  // ── UI state ──
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(1);
  const [paymentMethod, setPaymentMethod] = useState("MULTICAIXA");

  // ── formulários de auth ──
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSenha, setLoginSenha] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [regNome, setRegNome] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regSenha, setRegSenha] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regError, setRegError] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // ── formulários de checkout ──
  const [ckNome, setCkNome] = useState("");
  const [ckPhone, setCkPhone] = useState("");
  const [ckEmail, setCkEmail] = useState("");
  const [ckRua, setCkRua] = useState("");
  const [ckBairro, setCkBairro] = useState("");
  const [ckCidade, setCkCidade] = useState("Luanda");
  const [ckRef, setCkRef] = useState("");
  const [ckEnderecoId, setCkEnderecoId] = useState<string | null>(null);
  const [ckCupom, setCkCupom] = useState("");
  const [ckCupomData, setCkCupomData] = useState<CupomResponse | null>(null);
  const [ckCupomLoading, setCkCupomLoading] = useState(false);

  // ── polling de pedido ──
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS INTERNOS
  // ─────────────────────────────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
  }, []);

  const nav = useCallback((p: AppPage) => {
    setPage(p);
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  }, []);

  const goProduct = useCallback((p: Product) => {
    setSelectedProduct(p);
    nav("product");
  }, [nav]);

  const saveAuth = (data: AuthResponse) => {
    localStorage.setItem("kb_access_token", data.accessToken);
    localStorage.setItem("kb_refresh_token", data.refreshToken);
    const u: AuthUser = { userId: String(data.userId), nome: data.nome, email: data.email, role: data.role };
    localStorage.setItem("kb_user", JSON.stringify(u));
    setUser(u);
    setCkNome(data.nome);
    setCkEmail(data.email);
  };

  const clearAuth = () => {
    localStorage.removeItem("kb_access_token");
    localStorage.removeItem("kb_refresh_token");
    localStorage.removeItem("kb_user");
    setUser(null);
    setCart([]);
    setCartId(null);
    setMyOrders([]);
    setEnderecos([]);
    setActiveOrder(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CARRINHO — sincronizado com backend quando autenticado
  // ─────────────────────────────────────────────────────────────────────────
  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const TAXA_ENTREGA = 500;

  const fetchCarrinho = useCallback(async () => {
    if (!user) return;
    try {
      const data = await http.get<CarrinhoResponse>("/api/v1/carrinho");
      if (data) {
        setCartId(data.id);
        const items: CartItem[] = data.itens.map(i => ({
          carrinhoItemId: i.id,
          quantity: i.quantidade,
          product: {
            id: i.produtoId, name: i.nomeProduto,
            price: Number(i.precoUnitario), image: i.imagemUrl || "",
            category: "", description: "", rating: 4.8, reviews: 0,
          },
        }));
        // Enriquecer com dados completos dos produtos
        setCart(items.map(ci => {
          const full = products.find(p => p.id === ci.product.id);
          return full ? { ...ci, product: full } : ci;
        }));
      }
    } catch { /* silencioso */ }
  }, [user, products]);

  const addToCart = useCallback(async (product: Product) => {
    // Optimistic update
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id);
      if (ex) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });

    if (!user) return; // sem auth: apenas local

    setAddingProductId(product.id);
    try {
      // A API adiciona 1 ao existente ou cria novo
      await http.post("/api/v1/carrinho/itens", { produtoId: product.id, quantidade: 1 });
      await fetchCarrinho(); // ressincronizar IDs dos itens
      showToast(`${product.name} adicionado!`, "success");
    } catch (e: any) {
      // Reverter optimistic
      setCart(prev => {
        const updated = prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0);
        return updated;
      });
      showToast(e.message ?? "Erro ao adicionar ao carrinho", "error");
    } finally {
      setAddingProductId(null);
    }
  }, [user, fetchCarrinho, showToast]);

  const removeFromCart = useCallback(async (productId: string) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    setCart(prev => prev.filter(i => i.product.id !== productId));

    if (!user || !item.carrinhoItemId) return;
    setCartLoading(true);
    try {
      await http.delete(`/api/v1/carrinho/itens/${item.carrinhoItemId}`);
    } catch (e: any) {
      setCart(prev => [...prev, item]);
      showToast(e.message ?? "Erro ao remover item", "error");
    } finally {
      setCartLoading(false);
    }
  }, [cart, user, showToast]);

  const updateQty = useCallback(async (productId: string, delta: number) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;
    const newQty = Math.max(0, item.quantity + delta);

    if (newQty === 0) { removeFromCart(productId); return; }

    setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: newQty } : i));

    if (!user || !item.carrinhoItemId) return;
    try {
      await http.patch(`/api/v1/carrinho/itens/${item.carrinhoItemId}`, { quantidade: newQty });
    } catch (e: any) {
      setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: item.quantity } : i));
      showToast(e.message ?? "Erro ao atualizar quantidade", "error");
    }
  }, [cart, user, removeFromCart, showToast]);

  // ─────────────────────────────────────────────────────────────────────────
  // PEDIDOS — polling automático
  // ─────────────────────────────────────────────────────────────────────────
  const fetchMyOrders = useCallback(async () => {
    if (!user) return;
    try {
      const data = await http.get<SpringPage<PedidoResponse>>("/api/v1/pedidos");
      if (data?.content) setMyOrders(data.content);
    } catch { /* silencioso */ }
  }, [user]);

  const startPolling = useCallback((pedidoId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const pedido = await http.get<PedidoResponse>(`/api/v1/pedidos/${pedidoId}`);
        setActiveOrder(pedido);
        if (pedido.status === "ENTREGUE" || pedido.status === "CANCELADO") {
          clearInterval(pollingRef.current!);
        }
      } catch { clearInterval(pollingRef.current!); }
    }, 5000);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS DE AUTH
  // ─────────────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const data = await http.post<AuthResponse>("/api/v1/auth/login", { email: loginEmail, senha: loginSenha });
      saveAuth(data);
      showToast(`Bem-vindo, ${data.nome}!`, "success");
      nav("catalog");
    } catch (e: any) {
      setLoginError(e.message ?? "Email ou senha incorrectos");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regSenha !== regConfirm) { setRegError("As senhas não coincidem"); return; }
    setRegError(null);
    setRegLoading(true);
    try {
      const data = await http.post<AuthResponse>("/api/v1/auth/registrar", {
        nome: regNome, email: regEmail, senha: regSenha, telefone: regPhone,
      });
      saveAuth(data);
      showToast("Conta criada com sucesso!", "success");
      nav("catalog");
    } catch (e: any) {
      setRegError(e.message ?? "Erro ao criar conta");
    } finally {
      setRegLoading(false);
    }
  };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("kb_refresh_token");
    try { if (refreshToken) await http.post("/api/v1/auth/logout", { refreshToken }); } catch { /* ok */ }
    clearAuth();
    nav("home");
    showToast("Sessão terminada", "info");
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await http.post("/api/v1/auth/recuperar-senha", { email: forgotEmail });
      setForgotSent(true);
    } catch (e: any) {
      showToast(e.message ?? "Erro ao enviar email", "error");
    } finally {
      setForgotLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CHECKOUT
  // ─────────────────────────────────────────────────────────────────────────
  const validarCupom = async () => {
    if (!ckCupom.trim()) return;
    setCkCupomLoading(true);
    try {
      const data = await http.get<CupomResponse>(`/api/v1/cupons/validar/${ckCupom.toUpperCase()}`);
      setCkCupomData(data);
      showToast(`Cupom ${data.codigo} aplicado!`, "success");
    } catch (e: any) {
      setCkCupomData(null);
      showToast(e.message ?? "Cupom inválido", "error");
    } finally {
      setCkCupomLoading(false);
    }
  };

  const calcDesconto = () => {
    if (!ckCupomData) return 0;
    if (ckCupomData.tipoDesconto === "PERCENTUAL") return Math.floor(cartTotal * ckCupomData.valor / 100);
    return Math.min(ckCupomData.valor, cartTotal);
  };

  const criarEndereco = async (): Promise<string> => {
    const data = await http.post<EnderecoResponse>("/api/v1/enderecos", {
      rua: ckRua, bairro: ckBairro, cidade: ckCidade, referencia: ckRef, principal: true,
    });
    setCkEnderecoId(data.id);
    return data.id;
  };

  const finalizarPedido = async () => {
    if (!user) { nav("login"); return; }
    setOrderLoading(true);
    try {
      let endId = ckEnderecoId;
      if (!endId && ckRua && ckBairro) endId = await criarEndereco();

      const pedido = await http.post<PedidoResponse>("/api/v1/pedidos", {
        enderecoId: endId,
        cupomCodigo: ckCupomData?.codigo ?? null,
        observacao: null,
        metodoPagamento: paymentMethod,
      });

      setActiveOrder(pedido);
      startPolling(pedido.id);
      setCart([]);
      setCartId(null);
      setCkCupomData(null);
      setCkCupom("");
      setCheckoutStep(1);
      showToast(`Pedido ${pedido.numeroPedido} confirmado!`, "success");
      nav("tracking");
    } catch (e: any) {
      showToast(e.message ?? "Erro ao finalizar pedido", "error");
    } finally {
      setOrderLoading(false);
    }
  };

  const handleCheckoutNext = async () => {
    if (checkoutStep === 1) {
      if (!ckNome || !ckPhone) { showToast("Preencha todos os campos obrigatórios", "error"); return; }
      if (!user) { nav("login"); return; }
      setCheckoutStep(2);
    } else if (checkoutStep === 2) {
      if (!ckRua || !ckBairro || !ckCidade) { showToast("Preencha o endereço completo", "error"); return; }
      setCheckoutStep(3);
    } else if (checkoutStep === 3) {
      setCheckoutStep(4);
    } else {
      await finalizarPedido();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // EFEITOS INICIAIS
  // ─────────────────────────────────────────────────────────────────────────
  // Carregar produtos públicos
  useEffect(() => {
    (async () => {
      setProductsLoading(true);
      try {
        const data = await http.get<SpringPage<ProdutoResponse>>("/api/v1/produtos?size=50");
        if (data?.content?.length) {
          const mapped = data.content.map(mapProduto);
          setProducts(mapped);
          setSelectedProduct(mapped[0]);
        }
      } catch { /* usar fallback */ } finally {
        setProductsLoading(false);
      }
    })();
  }, []);

  // Carregar categorias
  useEffect(() => {
    http.get<CategoriaResponse[]>("/api/v1/categorias").then(d => { if (d) setApiCategories(d); }).catch(() => {});
  }, []);

  // Sincronizar carrinho quando logado
  useEffect(() => {
    if (user) {
      fetchCarrinho();
      fetchMyOrders();
      // Buscar endereços
      http.get<EnderecoResponse[]>("/api/v1/enderecos").then(d => { if (d) setEnderecos(d); }).catch(() => {});
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [user]);

  // Pré-preencher nome/email no checkout após login
  useEffect(() => {
    if (user) { setCkNome(user.nome); setCkEmail(user.email); }
  }, [user]);

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN — carregar dados
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (page === "admin" && user?.role === "ADMIN") {
      if (adminPage === "dashboard") {
        http.get<DashboardResponse>("/api/v1/dashboard").then(d => { if (d) setDashboard(d); }).catch(() => {});
      }
      if (adminPage === "products") {
        http.get<SpringPage<ProdutoResponse>>("/api/v1/admin/produtos?size=100").then(d => { if (d?.content) setAdminProducts(d.content); }).catch(() => { http.get<SpringPage<ProdutoResponse>>("/api/v1/produtos?size=100").then(d2 => { if (d2?.content) setAdminProducts(d2.content); }).catch(() => {}); });
      }
      if (adminPage === "orders") {
        http.get<SpringPage<PedidoResponse>>("/api/v1/pedidos/admin?size=50").then(d => { if (d?.content) setAdminOrders(d.content); }).catch(() => {});
      }
    }
  }, [page, adminPage, user]);

  // ─────────────────────────────────────────────────────────────────────────
  // CATEGORIAS DE FILTRO (mistura API + estáticas)
  // ─────────────────────────────────────────────────────────────────────────
  const filterCategories = [
    { id: "all", label: "Todos", icon: "🍽️" },
    ...STATIC_CATEGORIES.filter(c => c.id !== "all"),
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // NAVBAR
  // ─────────────────────────────────────────────────────────────────────────
  const Navbar = () => (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/96 backdrop-blur-lg border-b border-white/8">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <button onClick={() => nav("home")} className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#E8001A] flex items-center justify-center font-black text-white text-lg">K</div>
          <span className="text-white font-black text-xl tracking-tight hidden sm:block" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            KIKOLA <span className="text-[#FFCC00]">BURGUER</span>
          </span>
        </button>

        <div className="hidden md:flex items-center gap-7">
          {[["home", "Início"], ["catalog", "Cardápio"], ["tracking", "Rastrear Pedido"]].map(([p, l]) => (
            <button key={p} onClick={() => nav(p as AppPage)} className={`text-sm font-medium transition-colors ${page === p ? "text-[#E8001A]" : "text-white/70 hover:text-white"}`}>{l}</button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="hidden md:flex items-center gap-3">
              {(user.role === "ADMIN" || user.role === "FUNCIONARIO") && (
                <button onClick={() => nav("admin")} className="text-[#FFCC00] text-xs font-semibold border border-[#FFCC00]/30 px-3 py-1.5 rounded-full hover:bg-[#FFCC00]/10 transition-colors">⚙ Admin</button>
              )}
              <button onClick={() => nav("profile")} className="flex items-center gap-2 text-white/70 hover:text-white text-sm">
                <div className="w-7 h-7 rounded-full bg-[#E8001A] flex items-center justify-center text-white text-xs font-bold">{initials(user.nome)}</div>
                <span className="hidden lg:block">{user.nome.split(" ")[0]}</span>
              </button>
              <button onClick={handleLogout} className="text-white/40 hover:text-white transition-colors"><LogOut size={16} /></button>
            </div>
          ) : (
            <button onClick={() => nav("login")} className="hidden md:flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium">
              <User size={16} /> Entrar
            </button>
          )}

          <button onClick={() => nav("cart")} className="relative flex items-center gap-2 bg-[#E8001A] hover:bg-[#C4001A] text-white px-4 py-2 rounded-full text-sm font-bold transition-all hover:scale-105">
            <ShoppingCart size={16} />
            <span className="hidden sm:block">Carrinho</span>
            {cartCount > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#FFCC00] text-black text-xs font-black rounded-full flex items-center justify-center">{cartCount}</span>}
          </button>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-white/80">
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-black border-t border-white/8 py-4">
          <div className="flex flex-col px-4 gap-1">
            {[["home", "Início"], ["catalog", "Cardápio"], ["tracking", "Rastrear Pedido"]].map(([p, l]) => (
              <button key={p} onClick={() => nav(p as AppPage)} className="text-white/70 text-left py-3 text-sm border-b border-white/5 last:border-0">{l}</button>
            ))}
            {user ? (
              <>
                <button onClick={() => nav("profile")} className="text-white/70 text-left py-3 text-sm border-b border-white/5">👤 {user.nome}</button>
                {(user.role === "ADMIN" || user.role === "FUNCIONARIO") && (
                  <button onClick={() => nav("admin")} className="text-[#FFCC00] text-left py-3 text-sm border-b border-white/5">⚙️ Admin Dashboard</button>
                )}
                <button onClick={handleLogout} className="text-red-400 text-left py-3 text-sm">Sair</button>
              </>
            ) : (
              <button onClick={() => nav("login")} className="text-white/70 text-left py-3 text-sm">Entrar / Criar Conta</button>
            )}
          </div>
        </div>
      )}
    </nav>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // HOME
  // ─────────────────────────────────────────────────────────────────────────
  const HomePage = () => {
    const [faqOpen, setFaqOpen] = useState<number | null>(null);
    const faqs = [
      { q: "Qual é o tempo médio de entrega?", a: "30-45 minutos, dependendo da localização em Luanda." },
      { q: "Quais são as zonas de entrega?", a: "Todos os municípios de Luanda: Ingombota, Maianga, Rangel, Sambizanga, Cazenga, Talatona, Viana e Belas." },
      { q: "Como faço o pagamento?", a: "Multicaixa Express ou pagamento na entrega." },
      { q: "Posso personalizar o meu hambúrguer?", a: "Sim! Pode adicionar extras ao fazer o pedido." },
      { q: "Como rastreio o meu pedido?", a: "Após confirmar, acompanhe em tempo real na secção Rastrear Pedido." },
    ];
    const featured = [...products].sort((a, b) => b.reviews - a.reviews).slice(0, 3);
    return (
      <div className="min-h-screen bg-[#0C0C0C]">
        {/* Hero */}
        <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1550547660-d9450f859349?w=1920&h=1080&fit=crop&auto=format)" }} />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C0C0C] via-transparent to-transparent" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 grid md:grid-cols-2 gap-12 items-center w-full">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#E8001A]/15 border border-[#E8001A]/25 text-[#FFCC00] px-4 py-2 rounded-full text-sm font-semibold mb-6">
                <Flame size={14} className="text-[#E8001A]" /> Hambúrgueres Artesanais em Luanda
              </div>
              <h1 className="text-6xl md:text-8xl font-black text-white uppercase leading-none mb-6" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                O SABOR<br />QUE <span className="text-[#E8001A]">VICIA</span><br /><span className="text-[#FFCC00]">DE VERDADE</span>
              </h1>
              <p className="text-white/65 text-lg mb-8 max-w-md leading-relaxed">Hambúrgueres artesanais, ingredientes frescos e entrega rápida em toda Luanda.</p>
              <div className="bg-gradient-to-r from-[#E8001A] to-[#C4001A] rounded-2xl p-4 mb-8 flex items-center gap-4">
                <div className="text-3xl">🔥</div>
                <div>
                  <p className="text-white font-black text-base" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>PROMOÇÃO DA SEMANA</p>
                  <p className="text-white/90 text-sm">Combo Familiar por apenas 8.500 Kz — <span className="text-[#FFCC00] font-bold">Poupe 1.500 Kz</span></p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mb-10">
                <button onClick={() => nav("catalog")} className="bg-[#E8001A] hover:bg-[#C4001A] text-white px-8 py-4 rounded-full font-bold text-lg flex items-center gap-2 transition-all hover:scale-105">
                  Pedir Agora <ArrowRight size={20} />
                </button>
                <button onClick={() => nav("catalog")} className="border border-white/25 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white/8 transition-all">
                  Ver Cardápio
                </button>
              </div>
              <div className="flex gap-8">
                {[{ v: "4.9★", l: "Avaliação" }, { v: "2000+", l: "Clientes" }, { v: "30min", l: "Entrega" }].map(s => (
                  <div key={s.l}>
                    <p className="text-[#FFCC00] font-black text-2xl" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{s.v}</p>
                    <p className="text-white/40 text-xs uppercase tracking-wider">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden md:flex justify-center">
              <div className="relative w-96 h-96">
                <div className="absolute inset-0 bg-[#E8001A]/20 rounded-full blur-3xl" />
                <img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&h=700&fit=crop&auto=format" alt="Kikola Classic" className="relative z-10 w-full h-full object-cover rounded-full border-4 border-[#E8001A]/25" />
              </div>
            </div>
          </div>
        </section>

        {/* Category strip */}
        <section className="bg-[#E8001A] py-3.5">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-6 overflow-x-auto justify-center flex-wrap">
              {STATIC_CATEGORIES.filter(c => c.id !== "all").map(cat => (
                <button key={cat.id} onClick={() => { setActiveCategory(cat.id); nav("catalog"); }} className="flex items-center gap-2 text-white font-bold whitespace-nowrap hover:text-[#FFCC00] transition-colors text-sm">
                  <span>{cat.icon}</span><span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Featured */}
        <section className="py-20 max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-[#E8001A] font-semibold uppercase tracking-wider text-xs mb-2">⭐ Destaques</p>
              <h2 className="text-4xl md:text-5xl font-black text-white uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>MAIS PEDIDOS</h2>
            </div>
            <button onClick={() => nav("catalog")} className="text-[#FFCC00] flex items-center gap-1.5 text-sm font-semibold hover:gap-2.5 transition-all">
              Ver todos <ChevronRight size={16} />
            </button>
          </div>
          {productsLoading ? (
            <div className="flex justify-center py-12"><Spinner size={32} /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map(p => (
                <ProductCard key={p.id} product={p} onAdd={addToCart} onView={goProduct} loading={addingProductId === p.id} />
              ))}
            </div>
          )}
        </section>

        {/* Why Kikola */}
        <section className="py-20 max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <p className="text-[#E8001A] font-semibold uppercase tracking-wider text-xs mb-3">A nossa diferença</p>
            <h2 className="text-4xl md:text-5xl font-black text-white uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>PORQUÊ ESCOLHER<br /><span className="text-[#FFCC00]">KIKOLA BURGUER?</span></h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[{ icon: "🥩", title: "Carne Fresca", desc: "100% bovina, moída diariamente" }, { icon: "⚡", title: "Entrega Rápida", desc: "30 minutos ou grátis" }, { icon: "👨‍🍳", title: "Artesanal", desc: "Feito à mão com amor" }, { icon: "🏆", title: "Premiado", desc: "Melhor burger de Luanda 2023" }].map(b => (
              <div key={b.title} className="bg-[#141414] border border-white/5 rounded-2xl p-6 text-center hover:border-[#E8001A]/30 transition-colors group">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{b.icon}</div>
                <h3 className="text-white font-bold mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1rem" }}>{b.title}</h3>
                <p className="text-white/45 text-xs">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 max-w-2xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-white uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>PERGUNTAS FREQUENTES</h2>
          </div>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-[#141414] border border-white/5 rounded-xl overflow-hidden">
                <button className="w-full text-left px-5 py-4 flex items-center justify-between text-white text-sm font-semibold" onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                  <span>{faq.q}</span>
                  <ChevronDown size={15} className={`transition-transform text-[#E8001A] shrink-0 ml-3 ${faqOpen === i ? "rotate-180" : ""}`} />
                </button>
                {faqOpen === i && <div className="px-5 pb-4 text-white/55 text-sm leading-relaxed border-t border-white/5">{faq.a}</div>}
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-black border-t border-white/8 py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-[#E8001A] flex items-center justify-center text-white font-black">K</div>
                  <span className="text-white font-black" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>KIKOLA BURGUER</span>
                </div>
                <p className="text-white/45 text-sm leading-relaxed">O melhor hambúrguer artesanal de Luanda, Angola.</p>
                <div className="flex gap-3 mt-4">
                  {[Instagram, Facebook, Twitter].map((Icon, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-white/50 hover:bg-[#E8001A] hover:text-white transition-colors cursor-pointer"><Icon size={14} /></div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-white font-bold mb-4 text-xs uppercase tracking-wider">Navegação</h4>
                <div className="space-y-2.5">
                  {[["home", "Início"], ["catalog", "Cardápio"], ["tracking", "Rastrear Pedido"], ["register", "Criar Conta"]].map(([p, l]) => (
                    <button key={p} onClick={() => nav(p as AppPage)} className="block text-white/45 text-sm hover:text-white transition-colors">{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-white font-bold mb-4 text-xs uppercase tracking-wider">Contacto</h4>
                <div className="space-y-3">
                  {[{ Icon: Phone, text: "+244 923 456 789" }, { Icon: Mail, text: "info@kikolaburguer.ao" }, { Icon: MapPin, text: "Luanda, Angola" }, { Icon: Clock, text: "Seg-Dom: 10:00–23:00" }].map(({ Icon, text }) => (
                    <div key={text} className="flex items-center gap-2.5 text-white/45 text-sm"><Icon size={13} className="text-[#E8001A] shrink-0" />{text}</div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-white font-bold mb-4 text-xs uppercase tracking-wider">WhatsApp</h4>
                <p className="text-white/45 text-sm mb-4">Faça o seu pedido directamente pelo WhatsApp</p>
                <a href="https://wa.me/244923456789" className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-full text-sm font-semibold hover:bg-green-700 transition-colors">📱 Pedir via WhatsApp</a>
              </div>
            </div>
            <div className="border-t border-white/8 pt-6 flex flex-wrap items-center justify-between gap-4">
              <p className="text-white/25 text-xs">© 2024 Kikola Burguer. Todos os direitos reservados.</p>
              {user?.role === "ADMIN" && (
                <button onClick={() => nav("admin")} className="text-white/25 text-xs hover:text-white/50 transition-colors">⚙ Admin</button>
              )}
            </div>
          </div>
        </footer>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CATÁLOGO
  // ─────────────────────────────────────────────────────────────────────────
  const CatalogPage = () => {
    const [cat, setCat] = useState(activeCategory);
    const [q, setQ] = useState("");
    const filtered = products.filter(p =>
      (cat === "all" || p.category === cat) &&
      p.name.toLowerCase().includes(q.toLowerCase())
    );
    return (
      <div className="min-h-screen bg-[#0C0C0C] pt-16">
        <div className="bg-[#141414] border-b border-white/5 py-8">
          <div className="max-w-7xl mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-black text-white uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>CARDÁPIO KIKOLA</h1>
            <p className="text-white/45 mt-1 text-sm">Escolhe o que mais gostas e faz o teu pedido</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="relative mb-6">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
            <input type="text" placeholder="Pesquisar produto..." value={q} onChange={e => setQ(e.target.value)} className="w-full bg-[#161616] border border-white/8 rounded-full pl-11 pr-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#E8001A]/40 transition-colors" />
          </div>
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {filterCategories.map(c => (
              <button key={c.id} onClick={() => setCat(c.id)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${cat === c.id ? "bg-[#E8001A] text-white" : "bg-[#161616] border border-white/8 text-white/55 hover:text-white hover:border-white/20"}`}>
                <span>{c.icon}</span><span>{c.label}</span>
              </button>
            ))}
          </div>
          {productsLoading ? (
            <div className="flex justify-center py-20"><Spinner size={32} /></div>
          ) : (
            <>
              <p className="text-white/30 text-xs mb-6">{filtered.length} produto{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map(p => (
                  <ProductCard key={p.id} product={p} onAdd={addToCart} onView={goProduct} loading={addingProductId === p.id} />
                ))}
              </div>
              {filtered.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-5xl mb-4">🔍</p>
                  <p className="text-white/40">Nenhum produto encontrado</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DETALHE DO PRODUTO
  // ─────────────────────────────────────────────────────────────────────────
  const ProductDetailPage = () => {
    const product = selectedProduct;
    const [qty, setQty] = useState(1);
    const [imgIdx, setImgIdx] = useState(0);
    const images = [product.image, ...products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 3).map(p => p.image)];
    const related = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 3);
    return (
      <div className="min-h-screen bg-[#0C0C0C] pt-16">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex items-center gap-2 text-white/35 text-xs mb-8">
            <button onClick={() => nav("home")} className="hover:text-white">Início</button>
            <ChevronRight size={12} />
            <button onClick={() => nav("catalog")} className="hover:text-white">Cardápio</button>
            <ChevronRight size={12} />
            <span className="text-white/70">{product.name}</span>
          </div>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <div className="relative rounded-2xl overflow-hidden h-80 md:h-96 bg-[#161616] mb-4">
                <img src={images[imgIdx] || product.image} alt={product.name} className="w-full h-full object-cover" />
                {product.badge && <span className="absolute top-4 left-4 bg-[#E8001A] text-white text-xs font-black px-3 py-1.5 rounded-full uppercase">{product.badge}</span>}
              </div>
              <div className="flex gap-2">
                {images.slice(0, 4).map((img, i) => (
                  <button key={i} onClick={() => setImgIdx(i)} style={{ width: 72, height: 72 }} className={`rounded-xl overflow-hidden border-2 transition-colors ${imgIdx === i ? "border-[#E8001A]" : "border-transparent"}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex text-[#FFCC00]">{Array(5).fill(0).map((_, i) => <Star key={i} size={14} fill={i < Math.floor(product.rating) ? "currentColor" : "none"} />)}</div>
                <span className="text-white/40 text-sm">{product.reviews} avaliações</span>
              </div>
              <h1 className="text-4xl font-black text-white uppercase mb-4 leading-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{product.name}</h1>
              <p className="text-white/60 leading-relaxed mb-6 text-sm">{product.description}</p>
              {product.ingredients && (
                <div className="mb-6">
                  <h3 className="text-white font-bold mb-3 text-xs uppercase tracking-wider">Ingredientes</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.ingredients.map(ing => <span key={ing} className="bg-[#1C1C1C] border border-white/8 text-white/55 text-xs px-3 py-1.5 rounded-full">{ing}</span>)}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-white/35 text-xs uppercase tracking-wider mb-1">Preço</p>
                  <p className="text-[#FFCC00] font-black text-3xl" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{fmt(product.price * qty)}</p>
                </div>
                <div className="flex items-center gap-3 bg-[#161616] border border-white/8 rounded-full px-4 py-2.5">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="text-white/50 hover:text-white"><Minus size={15} /></button>
                  <span className="text-white font-bold w-5 text-center">{qty}</span>
                  <button onClick={() => setQty(qty + 1)} className="text-white/50 hover:text-white"><Plus size={15} /></button>
                </div>
              </div>
              <button
                onClick={async () => {
                  for (let i = 0; i < qty; i++) await addToCart(product);
                  nav("cart");
                }}
                disabled={addingProductId === product.id}
                className="w-full bg-[#E8001A] hover:bg-[#C4001A] text-white py-4 rounded-full font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-60"
              >
                {addingProductId === product.id ? <Spinner size={18} /> : <ShoppingCart size={19} />}
                Adicionar ao Carrinho
              </button>
            </div>
          </div>
          {related.length > 0 && (
            <div className="mt-16">
              <h2 className="text-3xl font-black text-white uppercase mb-6" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>TAMBÉM PODES GOSTAR</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {related.map(p => <ProductCard key={p.id} product={p} onAdd={addToCart} onView={goProduct} loading={addingProductId === p.id} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CARRINHO
  // ─────────────────────────────────────────────────────────────────────────
  const CartPage = () => {
    const [coupon, setCoupon] = useState(ckCupom);
    const desconto = calcDesconto();
    const total = cartTotal + TAXA_ENTREGA - desconto;

    if (cart.length === 0) return (
      <div className="min-h-screen bg-[#0C0C0C] pt-16 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-8xl mb-6">🛒</div>
          <h2 className="text-3xl font-black text-white uppercase mb-3" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>CARRINHO VAZIO</h2>
          <p className="text-white/45 mb-8 text-sm">Adiciona produtos do cardápio para continuar</p>
          <button onClick={() => nav("catalog")} className="bg-[#E8001A] text-white px-8 py-4 rounded-full font-bold">Ir ao Cardápio</button>
        </div>
      </div>
    );

    return (
      <div className="min-h-screen bg-[#0C0C0C] pt-16">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <h1 className="text-4xl font-black text-white uppercase mb-8" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>CARRINHO ({cartCount} {cartCount === 1 ? "item" : "itens"})</h1>
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-3 space-y-4">
              {cart.map(item => (
                <div key={item.product.id} className="bg-[#161616] border border-white/5 rounded-2xl p-4 flex gap-4">
                  <img src={item.product.image} alt={item.product.name} className="w-24 h-24 object-cover rounded-xl flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold mb-0.5" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1rem" }}>{item.product.name}</h3>
                    <p className="text-white/35 text-xs mb-3">{fmt(item.product.price)} / unidade</p>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 bg-[#1C1C1C] rounded-full px-3 py-1.5">
                        <button onClick={() => updateQty(item.product.id, -1)} disabled={cartLoading} className="text-white/50 hover:text-white"><Minus size={13} /></button>
                        <span className="text-white font-bold text-sm w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQty(item.product.id, 1)} disabled={cartLoading} className="text-white/50 hover:text-white"><Plus size={13} /></button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[#FFCC00] font-black" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{fmt(item.product.price * item.quantity)}</span>
                        <button onClick={() => removeFromCart(item.product.id)} className="text-white/25 hover:text-[#E8001A] transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => nav("catalog")} className="flex items-center gap-2 text-[#FFCC00] text-sm hover:gap-3 transition-all">
                <ChevronLeft size={15} /> Continuar a comprar
              </button>
            </div>
            <div className="md:col-span-2">
              <div className="bg-[#161616] border border-white/5 rounded-2xl p-6 sticky top-20">
                <h3 className="text-white font-black text-base uppercase mb-5" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>RESUMO DO PEDIDO</h3>
                <div className="space-y-3 mb-5">
                  <div className="flex justify-between text-white/55 text-sm"><span>Subtotal</span><span>{fmt(cartTotal)}</span></div>
                  <div className="flex justify-between text-white/55 text-sm"><span>Taxa de entrega</span><span>{fmt(TAXA_ENTREGA)}</span></div>
                  {desconto > 0 && <div className="flex justify-between text-green-400 text-sm"><span>Desconto ({ckCupomData?.codigo})</span><span>-{fmt(desconto)}</span></div>}
                  <div className="border-t border-white/8 pt-3 flex justify-between text-white font-black">
                    <span>Total</span>
                    <span className="text-[#FFCC00]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{fmt(total)}</span>
                  </div>
                </div>
                <div className="flex gap-2 mb-5">
                  <input
                    type="text" placeholder="Código promocional"
                    value={coupon} onChange={e => setCoupon(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { setCkCupom(coupon); validarCupom(); } }}
                    className="flex-1 bg-[#1C1C1C] border border-white/8 rounded-full px-4 py-2.5 text-white text-xs placeholder-white/25 focus:outline-none focus:border-[#E8001A]/40 uppercase"
                  />
                  <button onClick={() => { setCkCupom(coupon); validarCupom(); }} disabled={ckCupomLoading} className="bg-white/8 hover:bg-white/15 text-white px-3 py-2.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-50">
                    {ckCupomLoading ? <Spinner size={12} /> : "Aplicar"}
                  </button>
                </div>
                {ckCupomData && (
                  <div className="flex items-center gap-2 text-green-400 text-xs mb-4 bg-green-500/10 px-3 py-2 rounded-xl">
                    <Check size={12} /> Cupom <strong>{ckCupomData.codigo}</strong> aplicado!
                  </div>
                )}
                <button onClick={() => nav("checkout")} className="w-full bg-[#E8001A] hover:bg-[#C4001A] text-white py-4 rounded-full font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02]">
                  Finalizar Pedido <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CHECKOUT
  // ─────────────────────────────────────────────────────────────────────────
  const CheckoutPage = () => {
    const steps = ["Dados Pessoais", "Endereço", "Pagamento", "Confirmação"];
    const desconto = calcDesconto();
    const total = cartTotal + TAXA_ENTREGA - desconto;

    return (
      <div className="min-h-screen bg-[#0C0C0C] pt-16">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <h1 className="text-4xl font-black text-white uppercase mb-8" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>FINALIZAR PEDIDO</h1>

          {/* Steps */}
          <div className="flex items-start mb-8">
            {steps.map((step, i) => (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${i + 1 < checkoutStep ? "bg-green-500 text-white" : i + 1 === checkoutStep ? "bg-[#E8001A] text-white" : "bg-[#1C1C1C] border border-white/10 text-white/30"}`}>
                    {i + 1 < checkoutStep ? <Check size={14} /> : i + 1}
                  </div>
                  <span className={`text-xs mt-1.5 hidden sm:block text-center ${i + 1 === checkoutStep ? "text-white" : "text-white/25"}`}>{step}</span>
                </div>
                {i < steps.length - 1 && <div className={`flex-1 h-px mx-2 mt-[-14px] ${i + 1 < checkoutStep ? "bg-green-500" : "bg-white/8"}`} />}
              </div>
            ))}
          </div>

          <div className="bg-[#161616] border border-white/5 rounded-2xl p-6">
            {/* Step 1: Dados */}
            {checkoutStep === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-black text-white uppercase mb-5" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>DADOS PESSOAIS</h2>
                {!user && (
                  <div className="bg-[#1C1C1C] border border-[#E8001A]/30 rounded-xl p-4 mb-4">
                    <p className="text-white/70 text-sm mb-3">Para continuar, precisas de ter uma conta.</p>
                    <div className="flex gap-2">
                      <button onClick={() => nav("login")} className="flex-1 bg-[#E8001A] text-white py-2 rounded-full text-sm font-bold">Entrar</button>
                      <button onClick={() => nav("register")} className="flex-1 border border-white/15 text-white py-2 rounded-full text-sm font-semibold">Criar conta</button>
                    </div>
                  </div>
                )}
                {[{ label: "Nome Completo *", value: ckNome, setter: setCkNome, placeholder: "Seu nome completo", type: "text" },
                  { label: "Telefone *", value: ckPhone, setter: setCkPhone, placeholder: "+244 9XX XXX XXX", type: "tel" },
                  { label: "Email", value: ckEmail, setter: setCkEmail, placeholder: "seu@email.com", type: "email" }
                ].map(f => (
                  <div key={f.label}>
                    <label className="text-white/50 text-xs mb-1.5 block">{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder} value={f.value} onChange={e => f.setter(e.target.value)} className="w-full bg-[#1C1C1C] border border-white/8 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#E8001A]/40" />
                  </div>
                ))}
              </div>
            )}

            {/* Step 2: Endereço */}
            {checkoutStep === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-black text-white uppercase mb-5" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>ENDEREÇO DE ENTREGA</h2>
                {enderecos.length > 0 && (
                  <div className="mb-4">
                    <p className="text-white/50 text-xs mb-2">Usar endereço guardado:</p>
                    <div className="space-y-2">
                      {enderecos.map(e => (
                        <button key={e.id} onClick={() => {
                          setCkEnderecoId(e.id); setCkRua(e.rua); setCkBairro(e.bairro);
                          setCkCidade(e.cidade); setCkRef(e.referencia ?? "");
                        }} className={`w-full text-left p-3 rounded-xl border text-sm transition-colors ${ckEnderecoId === e.id ? "border-[#E8001A] bg-[#E8001A]/8 text-white" : "border-white/8 bg-[#1C1C1C] text-white/60 hover:border-white/20"}`}>
                          <span className="font-semibold">{e.rua}, {e.bairro}</span> — {e.cidade}
                          {e.principal && <span className="ml-2 text-xs text-[#FFCC00]">Principal</span>}
                        </button>
                      ))}
                    </div>
                    <p className="text-white/30 text-xs mt-3 mb-2">Ou introduzir novo endereço:</p>
                  </div>
                )}
                {[{ label: "Rua / Avenida *", value: ckRua, setter: setCkRua, placeholder: "Nome da rua" },
                  { label: "Bairro *", value: ckBairro, setter: setCkBairro, placeholder: "Nome do bairro" },
                  { label: "Cidade *", value: ckCidade, setter: setCkCidade, placeholder: "Luanda" },
                  { label: "Ponto de Referência", value: ckRef, setter: setCkRef, placeholder: "Próximo a..." },
                ].map(f => (
                  <div key={f.label}>
                    <label className="text-white/50 text-xs mb-1.5 block">{f.label}</label>
                    <input placeholder={f.placeholder} value={f.value} onChange={e => { f.setter(e.target.value); setCkEnderecoId(null); }} className="w-full bg-[#1C1C1C] border border-white/8 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#E8001A]/40" />
                  </div>
                ))}
              </div>
            )}

            {/* Step 3: Pagamento */}
            {checkoutStep === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl font-black text-white uppercase mb-5" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>MÉTODO DE PAGAMENTO</h2>
                {[
                  { id: "MULTICAIXA", icon: "💳", title: "Multicaixa Express", desc: "Pagamento instantâneo via Multicaixa" },
                  { id: "UNITEL_MONEY", icon: "📱", title: "Unitel Money", desc: "Pague com a tua carteira Unitel Money" },
                  { id: "ENTREGA", icon: "💵", title: "Pagamento na Entrega", desc: "Pague quando o pedido chegar" },
                ].map(m => (
                  <button key={m.id} onClick={() => setPaymentMethod(m.id)} className={`w-full flex items-center gap-4 rounded-xl p-4 border transition-colors text-left ${paymentMethod === m.id ? "border-[#E8001A] bg-[#E8001A]/8" : "border-white/8 bg-[#1C1C1C] hover:border-white/20"}`}>
                    <span className="text-2xl">{m.icon}</span>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{m.title}</p>
                      <p className="text-white/45 text-xs">{m.desc}</p>
                    </div>
                    {paymentMethod === m.id && <Check size={16} className="text-[#E8001A] shrink-0" />}
                  </button>
                ))}
              </div>
            )}

            {/* Step 4: Confirmação */}
            {checkoutStep === 4 && (
              <div>
                <h2 className="text-xl font-black text-white uppercase mb-5" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>CONFIRMAR PEDIDO</h2>
                <div className="space-y-3 mb-5">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex items-center gap-3 text-sm">
                      <img src={item.product.image} alt={item.product.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      <span className="text-white flex-1">{item.product.name} ×{item.quantity}</span>
                      <span className="text-[#FFCC00] font-bold shrink-0">{fmt(item.product.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/8 pt-4 space-y-2 mb-5 text-sm">
                  <div className="flex justify-between text-white/50"><span>Subtotal</span><span>{fmt(cartTotal)}</span></div>
                  <div className="flex justify-between text-white/50"><span>Entrega</span><span>{fmt(TAXA_ENTREGA)}</span></div>
                  {desconto > 0 && <div className="flex justify-between text-green-400"><span>Desconto</span><span>-{fmt(desconto)}</span></div>}
                  <div className="flex justify-between text-white font-black pt-2 border-t border-white/8"><span>Total</span><span className="text-[#FFCC00]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{fmt(total)}</span></div>
                </div>
                <div className="bg-[#1C1C1C] rounded-xl p-4 space-y-2 text-sm">
                  <p className="text-white/50">📍 <span className="text-white">{ckRua}, {ckBairro}, {ckCidade}</span></p>
                  <p className="text-white/50">💳 <span className="text-white">{paymentMethod === "MULTICAIXA" ? "Multicaixa Express" : paymentMethod === "UNITEL_MONEY" ? "Unitel Money" : "Pagamento na Entrega"}</span></p>
                  <p className="text-white/50">⏱️ <span className="text-white">Entrega estimada: 30-45 min</span></p>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 mt-8">
              {checkoutStep > 1 && (
                <button onClick={() => setCheckoutStep(prev => (prev - 1) as CheckoutStep)} className="flex-1 border border-white/10 text-white py-3 rounded-full font-semibold hover:bg-white/5 transition-colors text-sm">Voltar</button>
              )}
              <button onClick={handleCheckoutNext} disabled={orderLoading} className="flex-1 bg-[#E8001A] hover:bg-[#C4001A] text-white py-3 rounded-full font-bold transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {orderLoading ? <Spinner size={16} /> : null}
                {checkoutStep === 4 ? "✓ Confirmar Pedido" : "Continuar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // AUTH PAGES
  // ─────────────────────────────────────────────────────────────────────────
  const LoginPage = () => (
    <div className="min-h-screen bg-[#0C0C0C] pt-16 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#E8001A] flex items-center justify-center text-3xl font-black text-white mx-auto mb-4">K</div>
          <h1 className="text-3xl font-black text-white uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>BEM-VINDO DE VOLTA</h1>
          <p className="text-white/45 mt-2 text-sm">Entra na tua conta Kikola Burguer</p>
        </div>
        <div className="bg-[#161616] border border-white/5 rounded-2xl p-8">
          <form onSubmit={handleLogin}>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Email</label>
                <input type="email" placeholder="seu@email.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required className="w-full bg-[#1C1C1C] border border-white/8 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#E8001A]/40" />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Senha</label>
                <input type="password" placeholder="••••••••" value={loginSenha} onChange={e => setLoginSenha(e.target.value)} required className="w-full bg-[#1C1C1C] border border-white/8 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#E8001A]/40" />
              </div>
            </div>
            <button type="button" onClick={() => nav("forgot")} className="text-[#E8001A] text-xs hover:underline mb-6 block text-left">Esqueceste a senha?</button>
            {loginError && <div className="flex items-center gap-2 text-red-400 text-xs mb-4 bg-red-500/10 px-3 py-2 rounded-xl"><AlertCircle size={13} />{loginError}</div>}
            <button type="submit" disabled={loginLoading} className="w-full bg-[#E8001A] hover:bg-[#C4001A] text-white py-3.5 rounded-full font-bold mb-4 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
              {loginLoading ? <Spinner size={16} /> : null} Entrar
            </button>
          </form>
          <p className="text-center text-white/45 text-sm">Ainda não tens conta? <button onClick={() => nav("register")} className="text-[#E8001A] hover:underline font-semibold">Criar conta</button></p>
        </div>
      </div>
    </div>
  );

  const RegisterPage = () => (
    <div className="min-h-screen bg-[#0C0C0C] pt-16 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#E8001A] flex items-center justify-center text-3xl font-black text-white mx-auto mb-4">K</div>
          <h1 className="text-3xl font-black text-white uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>CRIAR CONTA</h1>
          <p className="text-white/45 mt-2 text-sm">Junta-te à família Kikola Burguer</p>
        </div>
        <div className="bg-[#161616] border border-white/5 rounded-2xl p-8">
          <form onSubmit={handleRegister}>
            <div className="space-y-4 mb-6">
              {[
                { label: "Nome Completo *", value: regNome, setter: setRegNome, placeholder: "Seu nome completo", type: "text" },
                { label: "Telefone *", value: regPhone, setter: setRegPhone, placeholder: "+244 9XX XXX XXX", type: "tel" },
                { label: "Email *", value: regEmail, setter: setRegEmail, placeholder: "seu@email.com", type: "email" },
                { label: "Senha * (mín. 8 caracteres)", value: regSenha, setter: setRegSenha, placeholder: "••••••••", type: "password" },
                { label: "Confirmar Senha *", value: regConfirm, setter: setRegConfirm, placeholder: "••••••••", type: "password" },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-white/50 text-xs mb-1.5 block">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={f.value} onChange={e => f.setter(e.target.value)} required className="w-full bg-[#1C1C1C] border border-white/8 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#E8001A]/40" />
                </div>
              ))}
            </div>
            {regError && <div className="flex items-center gap-2 text-red-400 text-xs mb-4 bg-red-500/10 px-3 py-2 rounded-xl"><AlertCircle size={13} />{regError}</div>}
            <button type="submit" disabled={regLoading} className="w-full bg-[#E8001A] hover:bg-[#C4001A] text-white py-3.5 rounded-full font-bold mb-4 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
              {regLoading ? <Spinner size={16} /> : null} Criar Conta
            </button>
          </form>
          <p className="text-center text-white/45 text-sm">Já tens conta? <button onClick={() => nav("login")} className="text-[#E8001A] hover:underline font-semibold">Entrar</button></p>
        </div>
      </div>
    </div>
  );

  const ForgotPage = () => (
    <div className="min-h-screen bg-[#0C0C0C] pt-16 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>RECUPERAR CONTA</h1>
          <p className="text-white/45 mt-2 text-sm">Envia-te um link de recuperação por email</p>
        </div>
        <div className="bg-[#161616] border border-white/5 rounded-2xl p-8">
          {forgotSent ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-4"><Check size={24} className="text-green-400" /></div>
              <p className="text-white font-bold mb-2">Email enviado!</p>
              <p className="text-white/50 text-sm mb-6">Verifica a tua caixa de entrada em <strong>{forgotEmail}</strong></p>
              <button onClick={() => nav("login")} className="text-[#E8001A] text-sm hover:underline">Voltar ao Login</button>
            </div>
          ) : (
            <form onSubmit={handleForgot}>
              <div className="mb-6">
                <label className="text-white/50 text-xs mb-1.5 block">Email da conta</label>
                <input type="email" placeholder="seu@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required className="w-full bg-[#1C1C1C] border border-white/8 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#E8001A]/40" />
              </div>
              <button type="submit" disabled={forgotLoading} className="w-full bg-[#E8001A] text-white py-3.5 rounded-full font-bold mb-3 flex items-center justify-center gap-2 disabled:opacity-60">
                {forgotLoading ? <Spinner size={16} /> : null} Enviar Link
              </button>
              <button type="button" onClick={() => nav("login")} className="w-full border border-white/8 text-white/50 py-3 rounded-full text-sm hover:bg-white/5">Voltar ao Login</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // PERFIL
  // ─────────────────────────────────────────────────────────────────────────
  const ProfilePage = () => {
    const [tab, setTab] = useState<"profile" | "addresses" | "orders">("profile");
    const [editNome, setEditNome] = useState(user?.nome ?? "");

    if (!user) { nav("login"); return null; }

    return (
      <div className="min-h-screen bg-[#0C0C0C] pt-16">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-[#E8001A] flex items-center justify-center text-white font-black text-2xl">{initials(user.nome)}</div>
            <div>
              <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{user.nome}</h1>
              <p className="text-white/40 text-sm">{user.email} · <span className="text-[#FFCC00] text-xs font-semibold">{user.role}</span></p>
            </div>
          </div>

          <div className="flex gap-2 mb-8">
            {[{ id: "profile", l: "Perfil" }, { id: "addresses", l: "Endereços" }, { id: "orders", l: "Meus Pedidos" }].map(t => (
              <button key={t.id} onClick={() => { setTab(t.id as typeof tab); if (t.id === "orders") fetchMyOrders(); }} className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${tab === t.id ? "bg-[#E8001A] text-white" : "bg-[#161616] border border-white/8 text-white/55 hover:text-white"}`}>{t.l}</button>
            ))}
          </div>

          {tab === "profile" && (
            <div className="bg-[#161616] border border-white/5 rounded-2xl p-6 space-y-4">
              <div><label className="text-white/35 text-xs uppercase tracking-wider mb-1.5 block">Nome</label><input value={editNome} onChange={e => setEditNome(e.target.value)} className="w-full bg-[#1C1C1C] border border-white/8 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#E8001A]/40" /></div>
              <div><label className="text-white/35 text-xs uppercase tracking-wider mb-1.5 block">Email</label><input defaultValue={user.email} readOnly className="w-full bg-[#1C1C1C] border border-white/8 rounded-xl px-4 py-3 text-white/50 text-sm cursor-not-allowed" /></div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => showToast("Perfil actualizado!", "success")} className="bg-[#E8001A] text-white px-6 py-3 rounded-full font-bold text-sm">Guardar</button>
                <button onClick={handleLogout} className="border border-white/10 text-white/50 px-6 py-3 rounded-full text-sm hover:bg-white/5">Sair da conta</button>
              </div>
            </div>
          )}

          {tab === "addresses" && (
            <div className="space-y-4">
              {enderecos.length === 0 && <p className="text-white/40 text-sm">Nenhum endereço guardado.</p>}
              {enderecos.map(e => (
                <div key={e.id} className="bg-[#161616] border border-white/5 rounded-2xl p-5 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <MapPin size={17} className="text-[#E8001A] mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-semibold text-sm">{e.rua}, {e.bairro}</p>
                        {e.principal && <span className="bg-[#E8001A]/15 text-[#E8001A] text-xs px-2 py-0.5 rounded-full">Principal</span>}
                      </div>
                      <p className="text-white/45 text-sm">{e.cidade}{e.referencia ? ` · ${e.referencia}` : ""}</p>
                    </div>
                  </div>
                  <button onClick={async () => {
                    await http.delete(`/api/v1/enderecos/${e.id}`);
                    setEnderecos(prev => prev.filter(x => x.id !== e.id));
                    showToast("Endereço removido", "info");
                  }} className="text-white/35 hover:text-[#E8001A] ml-4"><Trash2 size={15} /></button>
                </div>
              ))}
              <button onClick={() => nav("checkout")} className="w-full border border-dashed border-white/15 text-white/35 hover:border-[#E8001A]/30 hover:text-[#E8001A] py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors text-sm">
                <Plus size={15} /> Adicionar novo endereço
              </button>
            </div>
          )}

          {tab === "orders" && (
            <div className="space-y-4">
              {myOrders.length === 0 && <p className="text-white/40 text-sm">Nenhum pedido ainda. <button onClick={() => nav("catalog")} className="text-[#E8001A] hover:underline">Fazer primeiro pedido</button></p>}
              {myOrders.map(order => (
                <div key={order.id} className="bg-[#161616] border border-white/5 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-white font-bold text-sm">{order.numeroPedido}</p>
                      <p className="text-white/35 text-xs">{new Date(order.criadoEm).toLocaleDateString("pt-AO")} · {order.itens.length} item{order.itens.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#FFCC00] font-black" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{fmt(order.total)}</p>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                  <button onClick={() => { setActiveOrder(order); nav("tracking"); }} className="text-[#E8001A] text-xs hover:underline">Rastrear →</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // TRACKING
  // ─────────────────────────────────────────────────────────────────────────
  const TrackingPage = () => {
    const order = activeOrder;
    const status = order?.status ?? "PENDENTE";

    useEffect(() => {
      if (!user) return;
      if (order?.id) { startPolling(order.id); }
      else fetchMyOrders().then(() => { if (myOrders[0]) setActiveOrder(myOrders[0]); });
    }, []);

    const steps: { label: string; desc: string; states: StatusPedido[] }[] = [
      { label: "Pedido Recebido", desc: "O teu pedido foi recebido pelo restaurante", states: ["PENDENTE", "CONFIRMADO", "EM_PREPARACAO", "PRONTO", "EM_ENTREGA", "ENTREGUE"] },
      { label: "Confirmado", desc: "O teu pedido foi confirmado", states: ["CONFIRMADO", "EM_PREPARACAO", "PRONTO", "EM_ENTREGA", "ENTREGUE"] },
      { label: "Em Preparação", desc: "Os nossos cozinheiros estão a trabalhar", states: ["EM_PREPARACAO", "PRONTO", "EM_ENTREGA", "ENTREGUE"] },
      { label: "Saiu para Entrega", desc: "O entregador está a caminho", states: ["EM_ENTREGA", "ENTREGUE"] },
      { label: "Entregue!", desc: "Pedido entregue. Bom apetite! 🍔", states: ["ENTREGUE"] },
    ];

    return (
      <div className="min-h-screen bg-[#0C0C0C] pt-16">
        <div className="max-w-lg mx-auto px-4 py-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-white uppercase mb-3" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>RASTREAR PEDIDO</h1>
            {order ? (
              <div className="inline-flex items-center gap-2 bg-[#E8001A]/15 border border-[#E8001A]/25 text-white px-4 py-2 rounded-full">
                <span className="w-2 h-2 rounded-full bg-[#E8001A] animate-pulse" />
                <span className="text-sm font-semibold">{order.numeroPedido} — <StatusBadge status={status} /></span>
              </div>
            ) : (
              <p className="text-white/40 text-sm">Nenhum pedido activo encontrado</p>
            )}
          </div>

          {order && (
            <>
              <div className="bg-[#161616] border border-white/5 rounded-2xl p-6 mb-8 text-center">
                <p className="text-white/45 text-sm mb-2">Tempo estimado</p>
                <p className="text-5xl font-black text-[#FFCC00] mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {status === "ENTREGUE" ? "✓ Entregue" : status === "EM_ENTREGA" ? "~10 min" : "~30 min"}
                </p>
                <p className="text-white/45 text-sm">{status === "ENTREGUE" ? "Pedido entregue com sucesso!" : "O teu pedido está a caminho!"}</p>
              </div>

              <div className="relative pl-5 mb-8">
                <div className="absolute left-5 top-0 bottom-0 w-px bg-white/8" />
                <div className="space-y-6">
                  {steps.map((step, i) => {
                    const done = step.states.includes(status);
                    const isActive = step.states[0] === status;
                    return (
                      <div key={i} className="flex gap-4 relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-2 transition-all ${done && !isActive ? "bg-green-500 border-green-500" : isActive ? "bg-[#E8001A] border-[#E8001A] ring-4 ring-[#E8001A]/20" : "bg-[#0C0C0C] border-white/15"}`}>
                          {done && !isActive ? <Check size={15} className="text-white" /> : isActive ? <Truck size={14} className="text-white" /> : <div className="w-2 h-2 rounded-full bg-white/15" />}
                        </div>
                        <div className="flex-1">
                          <p className={`font-bold text-sm ${done || isActive ? "text-white" : "text-white/25"}`}>{step.label}</p>
                          <p className={`text-xs mt-0.5 ${done || isActive ? "text-white/45" : "text-white/15"}`}>{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#161616] border border-white/5 rounded-2xl p-5 mb-6">
                <h3 className="text-white font-bold mb-4 text-xs uppercase tracking-wider">Detalhes do Pedido</h3>
                <div className="space-y-2 text-sm">
                  {[
                    ["Pedido", order.numeroPedido],
                    ["Endereço", order.enderecoEntrega ? `${order.enderecoEntrega.rua}, ${order.enderecoEntrega.bairro}` : "Retirada no local"],
                    ["Pagamento", order.metodoPagamento],
                    ["Status pag.", order.statusPagamento],
                    ["Total", fmt(order.total)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-white/45">{k}</span>
                      <span className={k === "Total" ? "text-[#FFCC00] font-black" : "text-white"}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {!user && (
            <div className="text-center py-10">
              <p className="text-white/45 text-sm mb-4">Entra na tua conta para rastrear pedidos</p>
              <button onClick={() => nav("login")} className="bg-[#E8001A] text-white px-6 py-3 rounded-full font-bold">Entrar</button>
            </div>
          )}

          <a href="https://wa.me/244923456789" className="mt-4 w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white py-4 rounded-full font-bold transition-colors">
            📱 Contactar via WhatsApp
          </a>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN
  // ─────────────────────────────────────────────────────────────────────────
  const AdminLayout = () => {
    const [sidebar, setSidebar] = useState(true);
    const navItems = [
      { id: "dashboard", Icon: Home, l: "Dashboard" }, { id: "products", Icon: Package, l: "Produtos" },
      { id: "categories", Icon: Grid, l: "Categorias" }, { id: "orders", Icon: Truck, l: "Pedidos" },
      { id: "customers", Icon: Users, l: "Clientes" }, { id: "employees", Icon: UserCheck, l: "Funcionários" },
      { id: "coupons", Icon: Tag, l: "Cupões" }, { id: "permissions", Icon: Shield, l: "Permissões" },
      { id: "analytics", Icon: BarChart2, l: "Analytics" }, { id: "reports", Icon: FileText, l: "Relatórios" },
    ];
    if (!user || (user.role !== "ADMIN" && user.role !== "FUNCIONARIO")) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
          <div className="text-center">
            <Shield size={48} className="text-white/20 mx-auto mb-4" />
            <p className="text-white font-bold mb-2">Acesso restrito</p>
            <button onClick={() => nav("login")} className="text-[#E8001A] text-sm hover:underline">Fazer Login como Admin</button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex">
        <aside className={`${sidebar ? "w-60" : "w-16"} bg-[#111111] border-r border-white/5 flex flex-col transition-all duration-300 shrink-0`}>
          <div className="h-16 flex items-center px-4 border-b border-white/5">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[#E8001A] flex items-center justify-center text-white font-black text-sm shrink-0">K</div>
              {sidebar && <span className="text-white font-black text-sm whitespace-nowrap" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>KIKOLA ADMIN</span>}
            </div>
          </div>
          <nav className="flex-1 py-4 overflow-y-auto">
            {navItems.map(item => (
              <button key={item.id} onClick={() => setAdminPage(item.id as AdminPage)} className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-sm ${adminPage === item.id ? "bg-[#E8001A]/10 text-[#E8001A] border-r-2 border-[#E8001A]" : "text-white/45 hover:text-white hover:bg-white/4"}`}>
                <item.Icon size={17} className="shrink-0" />
                {sidebar && <span className="font-medium">{item.l}</span>}
              </button>
            ))}
          </nav>
          <div className="border-t border-white/5 p-4">
            <button onClick={() => nav("home")} className="w-full flex items-center gap-3 text-white/35 hover:text-white text-sm transition-colors">
              <LogOut size={17} className="shrink-0" />{sidebar && <span>Voltar ao site</span>}
            </button>
          </div>
        </aside>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 bg-[#111111] border-b border-white/5 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebar(!sidebar)} className="text-white/45 hover:text-white"><Menu size={19} /></button>
              <h2 className="text-white font-bold text-sm">{navItems.find(n => n.id === adminPage)?.l}</h2>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative text-white/45 hover:text-white"><Bell size={19} /></button>
              <div className="w-8 h-8 rounded-full bg-[#E8001A] flex items-center justify-center text-white font-bold text-xs">{initials(user.nome)}</div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            {adminPage === "dashboard" && <AdminDashboard />}
            {adminPage === "products" && <AdminProducts />}
            {adminPage === "categories" && <AdminCategories />}
            {adminPage === "orders" && <AdminOrders />}
            {adminPage === "analytics" && <AdminAnalytics />}
            {adminPage === "reports" && <AdminReports />}
            {["customers", "employees", "coupons", "permissions"].includes(adminPage) && <AdminPlaceholder page={adminPage} />}
          </main>
        </div>
      </div>
    );
  };

  const AdminPlaceholder = ({ page }: { page: string }) => (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-white/20 text-4xl mb-3">🚧</p>
        <p className="text-white/40 text-sm">Secção "{page}" em desenvolvimento</p>
      </div>
    </div>
  );

  const AdminDashboard = () => {
    const d = dashboard;
    const stats = d ? [
      { l: "Vendas Hoje", v: fmt(d.totalVendasHoje), Icon: DollarSign, c: "#E8001A", ch: `${d.pedidosHoje} pedidos` },
      { l: "Vendas Mês", v: fmt(d.totalVendasMes), Icon: TrendingUp, c: "#FFCC00", ch: `${d.pedidosMes} pedidos` },
      { l: "Ticket Médio", v: fmt(d.ticketMedio), Icon: Package, c: "#4CAF50", ch: "por pedido" },
      { l: "Clientes Activos", v: String(d.clientesAtivos), Icon: Users, c: "#2196F3", ch: "este mês" },
    ] : [
      { l: "Receita Total", v: "Carregando...", Icon: DollarSign, c: "#E8001A", ch: "" },
      { l: "Pedidos Hoje", v: "—", Icon: Package, c: "#FFCC00", ch: "" },
      { l: "Clientes", v: "—", Icon: Users, c: "#4CAF50", ch: "" },
      { l: "Ticket Médio", v: "—", Icon: TrendingUp, c: "#2196F3", ch: "" },
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.l} className="bg-[#161616] border border-white/5 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.c}18` }}>
                  <s.Icon size={19} style={{ color: s.c }} />
                </div>
                <span className="text-white/30 text-xs">{s.ch}</span>
              </div>
              <p className="text-2xl font-black text-white mb-0.5" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{s.v}</p>
              <p className="text-white/35 text-xs">{s.l}</p>
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#161616] border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-bold text-sm mb-5">Vendas da Semana (dados de demonstração)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={SALES_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" stroke="#ffffff30" tick={{ fill: "#ffffff50", fontSize: 11 }} />
                <YAxis stroke="#ffffff30" tick={{ fill: "#ffffff50", fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 12 }} formatter={(v: number) => [fmt(v), "Vendas"]} />
                <Bar dataKey="vendas" fill="#E8001A" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-[#161616] border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-bold text-sm mb-5">Por Categoria</h3>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart><Pie data={PIE_DATA} cx="50%" cy="50%" outerRadius={65} dataKey="value" stroke="none">
                {PIE_DATA.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie><Tooltip contentStyle={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11 }} /></PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {PIE_DATA.map(item => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: item.color }} /><span className="text-white/55">{item.name}</span></div>
                  <span className="text-white font-semibold">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {d?.produtosMaisVendidos && d.produtosMaisVendidos.length > 0 && (
          <div className="bg-[#161616] border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-bold text-sm mb-5">Produtos Mais Vendidos</h3>
            <div className="space-y-3">
              {d.produtosMaisVendidos.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-white/25 text-xs w-4">{i + 1}</span>
                  <span className="text-white text-sm flex-1">{p.nome}</span>
                  <span className="text-[#FFCC00] font-bold text-sm">{p.totalVendido} un.</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const AdminProducts = () => {
    const [filter, setFilter] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ProdutoResponse | null>(null);
    const [showStockModal, setShowStockModal] = useState<ProdutoResponse | null>(null);
    const [stockDelta, setStockDelta] = useState("");
    const [stockMotivo, setStockMotivo] = useState("");
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
      nome: "", descricao: "", preco: "", categoriaId: "",
      imagemUrl: "", disponivel: true, quantidadeEstoque: "0", estoqueMinimo: "5",
    });

    const baixoEstoque = adminProducts.filter(p => p.estoqueBaixo);
    const filtered = adminProducts.filter(p =>
      p.nome.toLowerCase().includes(filter.toLowerCase()) ||
      p.categoriaNome?.toLowerCase().includes(filter.toLowerCase())
    );

    const openCreate = () => {
      setEditingProduct(null);
      setForm({ nome: "", descricao: "", preco: "", categoriaId: apiCategories[0]?.id ?? "", imagemUrl: "", disponivel: true, quantidadeEstoque: "0", estoqueMinimo: "5" });
      setShowModal(true);
    };

    const openEdit = (p: ProdutoResponse) => {
      setEditingProduct(p);
      setForm({
        nome: p.nome, descricao: p.descricao ?? "", preco: String(p.preco),
        categoriaId: p.categoriaId, imagemUrl: p.imagemUrl ?? "",
        disponivel: p.disponivel,
        quantidadeEstoque: String(p.quantidadeEstoque ?? 0),
        estoqueMinimo: String(p.estoqueMinimo ?? 5),
      });
      setShowModal(true);
    };

    const saveProduct = async () => {
      if (!form.nome || !form.preco || !form.categoriaId) {
        showToast("Preenche nome, preço e categoria", "error"); return;
      }
      setSaving(true);
      try {
        const payload = {
          nome: form.nome, descricao: form.descricao,
          preco: parseFloat(form.preco), categoriaId: form.categoriaId,
          imagemUrl: form.imagemUrl || null, disponivel: form.disponivel,
          quantidadeEstoque: parseInt(form.quantidadeEstoque) || 0,
          estoqueMinimo: parseInt(form.estoqueMinimo) || 5,
        };
        if (editingProduct) {
          const updated = await http.put<ProdutoResponse>(`/api/v1/admin/produtos/${editingProduct.id}`, payload);
          setAdminProducts(prev => prev.map(p => p.id === editingProduct.id ? updated : p));
          showToast("Produto actualizado!", "success");
        } else {
          const created = await http.post<ProdutoResponse>("/api/v1/admin/produtos", payload);
          setAdminProducts(prev => [created, ...prev]);
          showToast("Produto criado!", "success");
        }
        setShowModal(false);
      } catch (e: any) { showToast(e.message ?? "Erro ao guardar", "error"); }
      finally { setSaving(false); }
    };

    const toggleDisponivel = async (p: ProdutoResponse) => {
      try {
        const updated = await http.put<ProdutoResponse>(`/api/v1/admin/produtos/${p.id}`, { ...p, disponivel: !p.disponivel });
        setAdminProducts(prev => prev.map(x => x.id === p.id ? updated : x));
        showToast(`Produto ${!p.disponivel ? "activado" : "desactivado"}`, "success");
      } catch (e: any) { showToast(e.message, "error"); }
    };

    const ajustarEstoque = async () => {
      if (!showStockModal || !stockDelta) return;
      const delta = parseInt(stockDelta);
      if (isNaN(delta)) { showToast("Valor inválido", "error"); return; }
      setSaving(true);
      try {
        const updated = await http.patch<ProdutoResponse>(`/api/v1/admin/produtos/${showStockModal.id}/estoque`, { delta, motivo: stockMotivo || "Ajuste manual" });
        setAdminProducts(prev => prev.map(p => p.id === showStockModal.id ? updated : p));
        showToast(`Stock actualizado: ${updated.quantidadeEstoque} unidades`, "success");
        setShowStockModal(null); setStockDelta(""); setStockMotivo("");
      } catch (e: any) { showToast(e.message, "error"); }
      finally { setSaving(false); }
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-xl font-black text-white uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>GESTÃO DE PRODUTOS</h2>
          <button onClick={openCreate} className="bg-[#E8001A] text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-[#c4001f] transition-colors">
            <Plus size={15} /> Novo Produto
          </button>
        </div>

        {/* Alerta stock baixo */}
        {baixoEstoque.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/25 rounded-2xl p-4">
            <p className="text-yellow-400 text-sm font-semibold mb-2">⚠️ {baixoEstoque.length} produto{baixoEstoque.length !== 1 ? "s" : ""} com stock baixo</p>
            <div className="flex flex-wrap gap-2">
              {baixoEstoque.map(p => (
                <span key={p.id} onClick={() => setShowStockModal(p)} className="text-xs bg-yellow-500/15 text-yellow-300 px-2.5 py-1 rounded-full cursor-pointer hover:bg-yellow-500/25 transition-colors">
                  {p.nome} ({p.quantidadeEstoque} un.)
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filtro */}
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
          <input type="text" placeholder="Filtrar produtos..." value={filter} onChange={e => setFilter(e.target.value)}
            className="w-full bg-[#161616] border border-white/8 rounded-full pl-10 pr-4 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#E8001A]/40" />
        </div>

        {/* Tabela */}
        <div className="bg-[#161616] border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-white/2">
                <tr className="border-b border-white/5">
                  {["Produto", "Categoria", "Preço", "Stock", "Estado", "Ações"].map(h => (
                    <th key={h} className="text-white/30 text-left px-4 py-3.5 font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-white/2">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.imagemUrl
                          ? <img src={p.imagemUrl} alt={p.nome} className="w-9 h-9 rounded-lg object-cover shrink-0 bg-[#1C1C1C]" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          : <div className="w-9 h-9 rounded-lg bg-[#1C1C1C] flex items-center justify-center text-white/20 shrink-0">🍔</div>
                        }
                        <span className="text-white font-medium">{p.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/50">{p.categoriaNome}</td>
                    <td className="px-4 py-3 text-[#FFCC00] font-bold">{fmt(p.preco)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${p.estoqueBaixo ? "text-yellow-400" : "text-white/70"}`}>{p.quantidadeEstoque ?? 0}</span>
                        <span className="text-white/25">un.</span>
                        {p.estoqueBaixo && <span className="text-yellow-400 text-xs">⚠️</span>}
                        <button onClick={() => { setShowStockModal(p); setStockDelta(""); setStockMotivo(""); }}
                          className="ml-1 text-white/30 hover:text-[#FFCC00] transition-colors" title="Ajustar stock">
                          <Edit size={11} />
                        </button>
                      </div>
                      <div className="w-16 bg-white/5 rounded-full h-1 mt-1.5">
                        <div className={`h-1 rounded-full transition-all ${p.estoqueBaixo ? "bg-yellow-400" : "bg-green-500"}`}
                          style={{ width: `${Math.min(100, ((p.quantidadeEstoque ?? 0) / Math.max(1, (p.estoqueMinimo ?? 5) * 4)) * 100)}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleDisponivel(p)}
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-colors ${p.disponivel ? "bg-green-500/15 text-green-400 hover:bg-green-500/25" : "bg-red-500/15 text-red-400 hover:bg-red-500/25"}`}>
                        {p.disponivel ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(p)} className="text-white/35 hover:text-white transition-colors" title="Editar"><Edit size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-white/30 text-sm">
                    {adminProducts.length === 0 ? "A carregar produtos..." : "Nenhum produto encontrado"}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Criar/Editar Produto */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
            <div className="bg-[#161616] border border-white/8 rounded-3xl p-6 w-full max-w-lg space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-black text-lg uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {editingProduct ? "EDITAR PRODUTO" : "NOVO PRODUTO"}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white text-2xl leading-none">×</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Nome *</label>
                  <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    placeholder="Ex: Mega Burger Classic"
                    className="w-full bg-[#1C1C1C] border border-white/8 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#E8001A]/40" />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Descrição</label>
                  <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                    rows={2} placeholder="Descrição do produto..."
                    className="w-full bg-[#1C1C1C] border border-white/8 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#E8001A]/40 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Preço (Kz) *</label>
                    <input type="number" min="0" step="0.01" value={form.preco} onChange={e => setForm(f => ({ ...f, preco: e.target.value }))}
                      placeholder="0.00"
                      className="w-full bg-[#1C1C1C] border border-white/8 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#E8001A]/40" />
                  </div>
                  <div>
                    <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Categoria *</label>
                    <select value={form.categoriaId} onChange={e => setForm(f => ({ ...f, categoriaId: e.target.value }))}
                      className="w-full bg-[#1C1C1C] border border-white/8 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#E8001A]/40">
                      <option value="">Seleccionar...</option>
                      {apiCategories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Stock inicial</label>
                    <input type="number" min="0" value={form.quantidadeEstoque} onChange={e => setForm(f => ({ ...f, quantidadeEstoque: e.target.value }))}
                      className="w-full bg-[#1C1C1C] border border-white/8 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#E8001A]/40" />
                  </div>
                  <div>
                    <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Stock mínimo</label>
                    <input type="number" min="0" value={form.estoqueMinimo} onChange={e => setForm(f => ({ ...f, estoqueMinimo: e.target.value }))}
                      className="w-full bg-[#1C1C1C] border border-white/8 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#E8001A]/40" />
                  </div>
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">URL da imagem</label>
                  <input value={form.imagemUrl} onChange={e => setForm(f => ({ ...f, imagemUrl: e.target.value }))}
                    placeholder="https://..."
                    className="w-full bg-[#1C1C1C] border border-white/8 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#E8001A]/40" />
                </div>
                <div className="flex items-center justify-between bg-[#1C1C1C] border border-white/8 rounded-xl px-4 py-3">
                  <span className="text-white/60 text-sm">Produto activo (disponível para venda)</span>
                  <button onClick={() => setForm(f => ({ ...f, disponivel: !f.disponivel }))}
                    className={`w-10 h-5 rounded-full transition-colors relative ${form.disponivel ? "bg-[#E8001A]" : "bg-white/15"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${form.disponivel ? "left-5" : "left-0.5"}`} />
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 bg-white/5 border border-white/8 text-white/60 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors">
                  Cancelar
                </button>
                <button onClick={saveProduct} disabled={saving} className="flex-1 bg-[#E8001A] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#c4001f] transition-colors disabled:opacity-50">
                  {saving ? "A guardar..." : editingProduct ? "Guardar" : "Criar Produto"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Ajuste de Stock */}
        {showStockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowStockModal(null); }}>
            <div className="bg-[#161616] border border-white/8 rounded-3xl p-6 w-full max-w-sm space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-black text-lg uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>AJUSTAR STOCK</h3>
                <button onClick={() => setShowStockModal(null)} className="text-white/40 hover:text-white text-2xl leading-none">×</button>
              </div>

              <div className="bg-[#1C1C1C] rounded-2xl p-4">
                <p className="text-white font-semibold text-sm">{showStockModal.nome}</p>
                <p className="text-white/40 text-xs mt-1">Stock actual: <span className={`font-bold ${showStockModal.estoqueBaixo ? "text-yellow-400" : "text-white/70"}`}>{showStockModal.quantidadeEstoque} unidades</span></p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Quantidade (+ entrada / − saída)</label>
                  <input type="number" value={stockDelta} onChange={e => setStockDelta(e.target.value)}
                    placeholder="Ex: +50 ou -10"
                    className="w-full bg-[#1C1C1C] border border-white/8 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#E8001A]/40" />
                  {stockDelta && !isNaN(parseInt(stockDelta)) && (
                    <p className="text-xs text-white/40 mt-1">
                      Resultado: {showStockModal.quantidadeEstoque} → <span className={parseInt(stockDelta) >= 0 ? "text-green-400" : "text-red-400"}>
                        {showStockModal.quantidadeEstoque + parseInt(stockDelta)} unidades
                      </span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Motivo (opcional)</label>
                  <input value={stockMotivo} onChange={e => setStockMotivo(e.target.value)}
                    placeholder="Ex: Reposição semanal, Inventário..."
                    className="w-full bg-[#1C1C1C] border border-white/8 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#E8001A]/40" />
                </div>
                {/* Atalhos rápidos */}
                <div>
                  <p className="text-white/30 text-xs mb-2">Atalhos rápidos:</p>
                  <div className="flex gap-2 flex-wrap">
                    {[10, 25, 50, 100].map(n => (
                      <button key={n} onClick={() => setStockDelta(String(n))}
                        className="bg-green-500/10 text-green-400 text-xs px-3 py-1 rounded-full hover:bg-green-500/20 transition-colors">+{n}</button>
                    ))}
                    {[5, 10, 25].map(n => (
                      <button key={-n} onClick={() => setStockDelta(String(-n))}
                        className="bg-red-500/10 text-red-400 text-xs px-3 py-1 rounded-full hover:bg-red-500/20 transition-colors">−{n}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowStockModal(null)} className="flex-1 bg-white/5 border border-white/8 text-white/60 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors">
                  Cancelar
                </button>
                <button onClick={ajustarEstoque} disabled={saving || !stockDelta} className="flex-1 bg-[#E8001A] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#c4001f] transition-colors disabled:opacity-50">
                  {saving ? "A guardar..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const AdminCategories = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-white uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>GESTÃO DE CATEGORIAS</h2>
        <button onClick={() => showToast("Modal em desenvolvimento", "info")} className="bg-[#E8001A] text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2"><Plus size={15} /> Nova Categoria</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(apiCategories.length > 0 ? apiCategories.map(c => ({ id: c.id, icon: "🍽️", label: c.nome, count: c.totalProdutos })) : STATIC_CATEGORIES.filter(c => c.id !== "all").map(c => ({ id: c.id, icon: c.icon, label: c.label, count: products.filter(p => p.category === c.id).length }))).map(cat => (
          <div key={cat.id} className="bg-[#161616] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{cat.icon}</span>
              <div>
                <p className="text-white font-semibold text-sm">{cat.label}</p>
                <p className="text-white/35 text-xs">{cat.count} produto{cat.count !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="text-white/35 hover:text-white"><Edit size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const AdminOrders = () => {
    const [filter, setFilter] = useState("all");
    const orders = adminOrders.length > 0 ? adminOrders : [];
    const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);
    const updateStatus = async (orderId: string, newStatus: StatusPedido) => {
      try {
        const updated = await http.patch<PedidoResponse>(`/api/v1/pedidos/${orderId}/status`, { status: newStatus });
        setAdminOrders(prev => prev.map(o => o.id === orderId ? updated : o));
        showToast("Estado actualizado!", "success");
      } catch (e: any) { showToast(e.message, "error"); }
    };
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-black text-white uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>GESTÃO DE PEDIDOS</h2>
        <div className="flex gap-2 flex-wrap">
          {["all", "PENDENTE", "CONFIRMADO", "EM_PREPARACAO", "PRONTO", "EM_ENTREGA", "ENTREGUE", "CANCELADO"].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === s ? "bg-[#E8001A] text-white" : "bg-[#161616] border border-white/8 text-white/50 hover:text-white"}`}>
              {s === "all" ? "Todos" : s.replace("_", " ")}
            </button>
          ))}
        </div>
        <div className="bg-[#161616] border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-white/2"><tr className="border-b border-white/5">{["Pedido", "Cliente", "Items", "Total", "Estado", "Data", "Acção"].map(h => <th key={h} className="text-white/30 text-left px-4 py-3.5 font-medium uppercase tracking-wider">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-white/4">
                {filtered.map(order => (
                  <tr key={order.id} className="hover:bg-white/2">
                    <td className="px-4 py-3 text-white font-medium">{order.numeroPedido}</td>
                    <td className="px-4 py-3 text-white/60">{order.usuarioNome}</td>
                    <td className="px-4 py-3 text-white/60">{order.itens.length}</td>
                    <td className="px-4 py-3 text-[#FFCC00] font-bold">{fmt(order.total)}</td>
                    <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-3 text-white/40">{new Date(order.criadoEm).toLocaleDateString("pt-AO")}</td>
                    <td className="px-4 py-3">
                      <select onChange={e => { if (e.target.value) updateStatus(order.id, e.target.value as StatusPedido); }} defaultValue="" className="bg-[#1C1C1C] border border-white/8 text-white/60 text-xs px-2 py-1.5 rounded-lg focus:outline-none">
                        <option value="" disabled>Alterar</option>
                        {(["CONFIRMADO", "EM_PREPARACAO", "PRONTO", "EM_ENTREGA", "ENTREGUE", "CANCELADO"] as StatusPedido[]).map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-white/30">Nenhum pedido encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const AdminAnalytics = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-white uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>ANALYTICS</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ l: "Taxa de Conversão", v: "3.8%" }, { l: "Novos Clientes", v: "142" }, { l: "Clientes Recorrentes", v: "68%" }, { l: "Ticket Médio", v: dashboard ? fmt(dashboard.ticketMedio) : "—" }].map(s => (
          <div key={s.l} className="bg-[#161616] border border-white/5 rounded-2xl p-5">
            <p className="text-white/35 text-xs mb-2 uppercase tracking-wider">{s.l}</p>
            <p className="text-2xl font-black text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{s.v}</p>
          </div>
        ))}
      </div>
      <div className="bg-[#161616] border border-white/5 rounded-2xl p-6">
        <h3 className="text-white font-bold text-sm mb-5">Pedidos por Dia</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={SALES_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="day" stroke="#ffffff25" tick={{ fill: "#ffffff50", fontSize: 11 }} />
            <YAxis stroke="#ffffff25" tick={{ fill: "#ffffff50", fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 11 }} />
            <Line type="monotone" dataKey="pedidos" stroke="#FFCC00" strokeWidth={2} dot={{ fill: "#FFCC00", strokeWidth: 0, r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const AdminReports = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-white uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>RELATÓRIOS</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { title: "Relatório de Vendas", icon: "💰", v: dashboard ? fmt(dashboard.totalVendasMes) : "—", sub: `${dashboard?.pedidosMes ?? 0} pedidos este mês` },
          { title: "Relatório de Clientes", icon: "👥", v: String(dashboard?.clientesAtivos ?? "—"), sub: "clientes activos" },
          { title: "Ticket Médio", icon: "🍔", v: dashboard ? fmt(dashboard.ticketMedio) : "—", sub: "por pedido" },
          { title: "Vendas Hoje", icon: "📦", v: dashboard ? fmt(dashboard.totalVendasHoje) : "—", sub: `${dashboard?.pedidosHoje ?? 0} pedidos hoje` },
        ].map(r => (
          <div key={r.title} className="bg-[#161616] border border-white/5 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-3xl mb-2 block">{r.icon}</span>
                <h3 className="text-white font-bold text-sm">{r.title}</h3>
                <p className="text-white/35 text-xs mt-0.5">{r.sub}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{r.v}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => showToast("Exportação em desenvolvimento", "info")} className="flex-1 bg-[#1C1C1C] border border-white/8 text-white/50 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-white/8">
                <Download size={12} /> PDF
              </button>
              <button onClick={() => showToast("Exportação em desenvolvimento", "info")} className="flex-1 bg-[#1C1C1C] border border-white/8 text-white/50 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-white/8">
                <Download size={12} /> Excel
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────────
  if (page === "admin") return (
    <>
      <AdminLayout />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  );

  return (
    <div className="min-h-screen bg-[#0C0C0C]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Navbar />
      {page === "home" && <HomePage />}
      {page === "catalog" && <CatalogPage />}
      {page === "product" && <ProductDetailPage />}
      {page === "cart" && <CartPage />}
      {page === "checkout" && <CheckoutPage />}
      {page === "login" && <LoginPage />}
      {page === "register" && <RegisterPage />}
      {page === "forgot" && <ForgotPage />}
      {page === "profile" && <ProfilePage />}
      {page === "tracking" && <TrackingPage />}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}