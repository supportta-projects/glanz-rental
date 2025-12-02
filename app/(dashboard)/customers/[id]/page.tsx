"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  PhoneCall,
  MapPin,
  CreditCard,
  ShoppingBag,
  Calendar,
  IndianRupee,
  User,
  Mail,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { StandardButton } from "@/components/shared/standard-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomer, useCustomerOrders, useUpdateCustomer } from "@/lib/queries/customers";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatCurrency, getOrderStatus } from "@/lib/utils/date";
import { Select, SelectItem } from "@/components/ui/select";
import { IdProofUpload } from "@/components/customers/id-proof-upload";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { PageNavbar } from "@/components/layout/page-navbar";

export default function CustomerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  const { showToast } = useToast();

  const { data: customer, isLoading: customerLoading } = useCustomer(customerId);
  const { data: orders, isLoading: ordersLoading } = useCustomerOrders(customerId);
  const updateCustomerMutation = useUpdateCustomer();

  const [isEditing, setIsEditing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    id_proof_type: "" as "aadhar" | "passport" | "voter" | "others" | "",
    id_proof_number: "",
    id_proof_front_url: "",
    id_proof_back_url: "",
  });

  // Initialize form data when customer loads
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        phone: customer.phone || "",
        address: customer.address || "",
        id_proof_type: (customer.id_proof_type as any) || "",
        id_proof_number: customer.id_proof_number || "",
        id_proof_front_url: customer.id_proof_front_url || "",
        id_proof_back_url: customer.id_proof_back_url || "",
      });
    }
  }, [customer]);

  // Phone number validation: exactly 10 digits
  const validatePhone = (phone: string): boolean => {
    const digitsOnly = phone.replace(/\D/g, "");
    return digitsOnly.length === 10;
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      showToast("Name and phone number are required", "error");
      return;
    }

    if (!validatePhone(formData.phone)) {
      showToast("Phone number must be exactly 10 digits", "error");
      return;
    }

    try {
      await updateCustomerMutation.mutateAsync({
        customerId,
        updates: {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim() || undefined,
          id_proof_type: formData.id_proof_type || undefined,
          id_proof_number: formData.id_proof_number.trim() || undefined,
          id_proof_front_url: formData.id_proof_front_url || undefined,
          id_proof_back_url: formData.id_proof_back_url || undefined,
        },
      });

      showToast("Customer updated successfully", "success");
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error updating customer:", error);
      showToast(
        error.message?.includes("unique")
          ? "Phone number already exists"
          : "Failed to update customer",
        "error"
      );
    }
  };

  const handleCancel = () => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        phone: customer.phone || "",
        address: customer.address || "",
        id_proof_type: (customer.id_proof_type as any) || "",
        id_proof_number: customer.id_proof_number || "",
        id_proof_front_url: customer.id_proof_front_url || "",
        id_proof_back_url: customer.id_proof_back_url || "",
      });
    }
    setIsEditing(false);
  };

  const getProofTypeLabel = (type?: string) => {
    if (!type) return null;
    const labels: Record<string, string> = {
      aadhar: "Aadhar",
      passport: "Passport",
      voter: "Voter ID",
      others: "Others",
    };
    return labels[type] || type;
  };

  const getStatusBadge = (order: any) => {
    const status = getOrderStatus(order.start_date, order.end_date, order.status);
    const variants: Record<string, { bg: string; text: string }> = {
      active: { bg: "bg-green-100 text-green-700", text: "Active" },
      pending_return: { bg: "bg-red-100 text-red-700", text: "Pending Return" },
      completed: { bg: "bg-gray-100 text-gray-700", text: "Completed" },
      scheduled: { bg: "bg-blue-100 text-blue-700", text: "Scheduled" },
      partially_returned: { bg: "bg-orange-100 text-orange-700", text: "Partial" },
    };
    const variant = variants[status] || variants.completed;
    return <Badge className={`${variant.bg} border-0 text-xs`}>{variant.text}</Badge>;
  };

  // Calculate customer stats
  const totalOrders = orders?.length || 0;
  const totalSpent = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
  const activeOrders = orders?.filter((o) => getOrderStatus(o.start_date, o.end_date, o.status) === "active").length || 0;

  if (customerLoading) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] pb-24">
        <div className="bg-white border-b p-4 flex items-center gap-4 sticky top-0 z-10">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-8 w-48 rounded" />
        </div>
        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] pb-24">
        <PageNavbar title="Customer Not Found" backHref="/customers" />
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <Card className="p-8 text-center">
            <p className="text-gray-500">Customer not found</p>
            <Link href="/customers">
              <StandardButton variant="outline" className="mt-4">Back to Customers</StandardButton>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] pb-24">
      {/* Modern Professional Navbar */}
      <PageNavbar
        title={customer.name || "Customer"}
        subtitle={customer.customer_number || undefined}
        backHref="/customers"
        actions={
          !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[#273492]/10 active:bg-[#273492]/20 transition-colors text-[#273492] hover:text-[#1f2a7a]"
              aria-label="Edit customer"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )
        }
      />

      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Stats Cards Row - Desktop Only */}
        <div className="hidden md:grid grid-cols-3 gap-4">
          <Card className="p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Total Orders</p>
                <p className="text-2xl font-bold text-blue-900">{totalOrders}</p>
              </div>
              <div className="p-3 bg-blue-200/50 rounded-lg">
                <ShoppingBag className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Total Spent</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(totalSpent)}</p>
              </div>
              <div className="p-3 bg-green-200/50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">Active Rentals</p>
                <p className="text-2xl font-bold text-purple-900">{activeOrders}</p>
              </div>
              <div className="p-3 bg-purple-200/50 rounded-lg">
                <Clock className="h-6 w-6 text-purple-700" />
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content Grid - Desktop: 2 columns, Mobile: 1 column */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Customer Information (Desktop: 2/3 width, Mobile: full) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information Card - Modern Design */}
            <Card className="p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm bg-white">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Customer Information</h2>
                  <p className="text-sm text-gray-500">Personal details and identification</p>
                </div>
                {isEditing && (
                  <div className="flex gap-2">
                    <StandardButton
                      onClick={handleCancel}
                      variant="outline"
                      icon={X}
                    >
                      Cancel
                    </StandardButton>
                    <StandardButton
                      onClick={handleSave}
                      variant="default"
                      icon={Save}
                      disabled={updateCustomerMutation.isPending}
                      loading={updateCustomerMutation.isPending}
                    >
                      {updateCustomerMutation.isPending ? "Saving..." : "Save"}
                    </StandardButton>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-5">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">
                      Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="h-11 text-base rounded-lg border-gray-300 focus:border-[#273492] focus:ring-[#273492]"
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">
                      Phone Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setFormData({ ...formData, phone: value });
                      }}
                      placeholder="Enter 10-digit phone number"
                      className="h-11 text-base rounded-lg border-gray-300 focus:border-[#273492] focus:ring-[#273492]"
                      inputMode="numeric"
                      maxLength={10}
                      required
                    />
                    {formData.phone && !validatePhone(formData.phone) && (
                      <p className="text-xs text-red-500 mt-1">
                        Phone number must be exactly 10 digits
                      </p>
                    )}
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Address (Optional)</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="h-11 text-base rounded-lg border-gray-300 focus:border-[#273492] focus:ring-[#273492]"
                    />
                  </div>

                  {/* ID Proof Type */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">ID Proof Type</Label>
                    <Select
                      value={formData.id_proof_type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          id_proof_type: e.target.value as any,
                        })
                      }
                    >
                      <SelectItem value="">Select ID proof type</SelectItem>
                      <SelectItem value="aadhar">Aadhar</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="voter">Voter ID</SelectItem>
                      <SelectItem value="others">Others</SelectItem>
                    </Select>
                  </div>

                  {/* ID Proof Number */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">ID Proof Number</Label>
                    <Input
                      value={formData.id_proof_number}
                      onChange={(e) =>
                        setFormData({ ...formData, id_proof_number: e.target.value })
                      }
                      className="h-11 text-base rounded-lg border-gray-300 focus:border-[#273492] focus:ring-[#273492]"
                    />
                  </div>

                  {/* ID Proof Images */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <IdProofUpload
                      label="Front Side"
                      currentUrl={formData.id_proof_front_url}
                      onUploadComplete={(url) =>
                        setFormData({ ...formData, id_proof_front_url: url })
                      }
                      onRemove={() => setFormData({ ...formData, id_proof_front_url: "" })}
                    />
                    <IdProofUpload
                      label="Back Side"
                      currentUrl={formData.id_proof_back_url}
                      onUploadComplete={(url) =>
                        setFormData({ ...formData, id_proof_back_url: url })
                      }
                      onRemove={() => setFormData({ ...formData, id_proof_back_url: "" })}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Customer Header with Avatar */}
                  <div className="flex items-start gap-4 pb-6 border-b border-gray-200">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#273492] to-[#1f2a7a] flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {customer.name?.charAt(0).toUpperCase() || "C"}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">{customer.name}</h3>
                      {customer.customer_number && (
                        <p className="text-sm font-mono text-[#273492] bg-[#273492]/10 px-2 py-1 rounded inline-block">
                          {customer.customer_number}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Contact Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Phone */}
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="p-2 bg-[#273492]/10 rounded-lg">
                        <PhoneCall className="h-5 w-5 text-[#273492]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                          Phone Number
                        </Label>
                        <a
                          href={`tel:${customer.phone}`}
                          className="text-base font-semibold text-gray-900 hover:text-[#273492] transition-colors"
                        >
                          {customer.phone}
                        </a>
                      </div>
                    </div>

                    {/* Address */}
                    {customer.address && (
                      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="p-2 bg-[#273492]/10 rounded-lg">
                          <MapPin className="h-5 w-5 text-[#273492]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                            Address
                          </Label>
                          <p className="text-base text-gray-900 leading-relaxed">{customer.address}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ID Proof Section */}
                  {(customer.id_proof_type || customer.id_proof_number || customer.id_proof_front_url || customer.id_proof_back_url) && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-[#273492]/10 rounded-lg">
                          <CreditCard className="h-5 w-5 text-[#273492]" />
                        </div>
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          ID Proof
                        </Label>
                      </div>
                      <div className="space-y-3">
                        {customer.id_proof_type && (
                          <div>
                            <Badge variant="outline" className="text-sm">
                              {getProofTypeLabel(customer.id_proof_type)}
                            </Badge>
                          </div>
                        )}
                        {customer.id_proof_number && (
                          <p className="text-sm font-medium text-gray-700">{customer.id_proof_number}</p>
                        )}
                        {(customer.id_proof_front_url || customer.id_proof_back_url) && (
                          <div className="flex gap-3 mt-3">
                            {customer.id_proof_front_url && (
                              <div className="relative group">
                                <img
                                  src={customer.id_proof_front_url}
                                  alt="ID Front"
                                  className="w-32 h-40 object-cover rounded-lg border-2 border-gray-300 cursor-pointer hover:border-[#273492] transition-all hover:shadow-md"
                                  onClick={() => setSelectedImage(customer.id_proof_front_url || null)}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 rounded-lg transition-colors flex items-center justify-center">
                                  <span className="text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                    View
                                  </span>
                                </div>
                              </div>
                            )}
                            {customer.id_proof_back_url && (
                              <div className="relative group">
                                <img
                                  src={customer.id_proof_back_url}
                                  alt="ID Back"
                                  className="w-32 h-40 object-cover rounded-lg border-2 border-gray-300 cursor-pointer hover:border-[#273492] transition-all hover:shadow-md"
                                  onClick={() => setSelectedImage(customer.id_proof_back_url || null)}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 rounded-lg transition-colors flex items-center justify-center">
                                  <span className="text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                    View
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Member Since */}
                  {customer.created_at && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">Member since</span>
                        <span>{formatDate(customer.created_at, "dd MMM yyyy")}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Orders History Card - Modern Design */}
            <Card className="p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm bg-white">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Order History</h2>
                  <p className="text-sm text-gray-500">Complete rental history for this customer</p>
                </div>
                {orders && orders.length > 0 && (
                  <Badge variant="outline" className="text-sm font-semibold px-3 py-1">
                    {orders.length} {orders.length === 1 ? "order" : "orders"}
                  </Badge>
                )}
              </div>

              {ordersLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                  ))}
                </div>
              ) : orders && orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      className="block group"
                    >
                      <Card className="p-4 rounded-lg hover:shadow-md transition-all border border-gray-200 bg-white group-hover:border-[#273492]/30">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 bg-[#273492]/10 rounded-lg">
                                <ShoppingBag className="h-4 w-4 text-[#273492]" />
                              </div>
                              <span className="font-bold text-base text-gray-900">
                                {order.invoice_number}
                              </span>
                              {getStatusBadge(order)}
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-3">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span>
                                  {formatDate(order.start_date, "dd MMM")} -{" "}
                                  {formatDate(order.end_date, "dd MMM")}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <IndianRupee className="h-4 w-4 text-green-600" />
                                <span className="font-semibold text-green-600">
                                  {formatCurrency(order.total_amount)}
                                </span>
                              </div>
                            </div>
                            {order.created_at && (
                              <p className="text-xs text-gray-400 mt-2">
                                Created {formatDate(order.created_at, "dd MMM yyyy, hh:mm a")}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 p-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <ShoppingBag className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-semibold mb-1">No orders yet</p>
                  <p className="text-sm text-gray-500">
                    This customer hasn't placed any orders
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column - Quick Stats (Desktop Only) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Stats Card */}
            <Card className="p-6 rounded-xl border border-gray-200 shadow-sm bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-blue-700">Total Orders</span>
                  <span className="text-lg font-bold text-blue-900">{totalOrders}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-green-700">Total Spent</span>
                  <span className="text-lg font-bold text-green-900">{formatCurrency(totalSpent)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm font-medium text-purple-700">Active Rentals</span>
                  <span className="text-lg font-bold text-purple-900">{activeOrders}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Image Lightbox for ID Proof Images */}
      {selectedImage && (
        <ImageLightbox
          imageUrl={selectedImage}
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          alt="ID Proof"
        />
      )}
    </div>
  );
}
