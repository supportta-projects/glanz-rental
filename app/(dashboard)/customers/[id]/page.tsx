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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    };
    const variant = variants[status] || variants.completed;
    return <Badge className={`${variant.bg} border-0`}>{variant.text}</Badge>;
  };

  if (customerLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 pb-24">
        <div className="bg-white border-b p-4 flex items-center gap-4 sticky top-0 z-10">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-8 w-48 rounded" />
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-zinc-50 pb-24">
        <div className="bg-white border-b p-4 flex items-center gap-4 sticky top-0 z-10">
          <Link href="/customers">
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Customer Not Found</h1>
        </div>
        <div className="p-4">
          <Card className="p-8 text-center">
            <p className="text-gray-500">Customer not found</p>
            <Link href="/customers">
              <Button className="mt-4">Back to Customers</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Customer Details</h1>
        </div>
        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            className="h-10 gap-2"
          >
            <Edit2 className="h-4 w-4" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Customer Information Card */}
        <Card className="p-4 md:p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Customer Information</h2>
            {isEditing && (
              <div className="flex gap-2">
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="sm"
                  className="h-9"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  size="sm"
                  className="h-9 bg-sky-500 hover:bg-sky-600"
                  disabled={updateCustomerMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {updateCustomerMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-12 text-base rounded-xl"
                  required
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    // Only allow digits and limit to 10
                    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setFormData({ ...formData, phone: value });
                  }}
                  placeholder="Enter 10-digit phone number"
                  className="h-12 text-base rounded-xl"
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
                <Label className="text-sm text-gray-600">Address (Optional)</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="h-12 text-base rounded-xl"
                />
              </div>

              {/* ID Proof Type */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">ID Proof Type</Label>
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
                <Label className="text-sm text-gray-600">ID Proof Number</Label>
                <Input
                  value={formData.id_proof_number}
                  onChange={(e) =>
                    setFormData({ ...formData, id_proof_number: e.target.value })
                  }
                  className="h-12 text-base rounded-xl"
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
            <div className="space-y-4">
              {/* Customer Number */}
              {customer.customer_number && (
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <Label className="text-xs text-gray-500 mb-1">Customer ID</Label>
                    <p className="text-base font-semibold text-[#0b63ff] font-mono">{customer.customer_number}</p>
                  </div>
                </div>
              )}

              {/* Name */}
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <Label className="text-xs text-gray-500 mb-1">Name</Label>
                  <p className="text-base font-semibold text-gray-900">{customer.name}</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3">
                <PhoneCall className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <Label className="text-xs text-gray-500 mb-1">Phone Number</Label>
                  <p className="text-base text-gray-900">{customer.phone}</p>
                </div>
              </div>

              {/* Address */}
              {customer.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <Label className="text-xs text-gray-500 mb-1">Address</Label>
                    <p className="text-base text-gray-900">{customer.address}</p>
                  </div>
                </div>
              )}

              {/* ID Proof */}
              {(customer.id_proof_type || customer.id_proof_number) && (
                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs text-gray-500">ID Proof</Label>
                    {customer.id_proof_type && (
                      <div>
                        <Badge variant="outline" className="text-xs">
                          {getProofTypeLabel(customer.id_proof_type)}
                        </Badge>
                      </div>
                    )}
                    {customer.id_proof_number && (
                      <p className="text-sm text-gray-700">{customer.id_proof_number}</p>
                    )}
                    {(customer.id_proof_front_url || customer.id_proof_back_url) && (
                      <div className="flex gap-2 mt-2">
                        {customer.id_proof_front_url && (
                          <img
                            src={customer.id_proof_front_url}
                            alt="ID Front"
                            className="w-24 h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
                            onClick={() => setSelectedImage(customer.id_proof_front_url || null)}
                          />
                        )}
                        {customer.id_proof_back_url && (
                          <img
                            src={customer.id_proof_back_url}
                            alt="ID Back"
                            className="w-24 h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
                            onClick={() => setSelectedImage(customer.id_proof_back_url || null)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Created Date */}
              {customer.created_at && (
                <div className="pt-3 border-t">
                  <Label className="text-xs text-gray-500">Member Since</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatDate(customer.created_at, "dd MMM yyyy")}
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Orders History */}
        <Card className="p-4 md:p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Order History</h2>
            {orders && orders.length > 0 && (
              <Badge variant="outline" className="text-sm">
                {orders.length} {orders.length === 1 ? "order" : "orders"}
              </Badge>
            )}
          </div>

          {ordersLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="space-y-2">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block"
                >
                  <Card className="p-3 rounded-lg hover:shadow-sm transition-all border border-gray-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <ShoppingBag className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="font-semibold text-gray-900 text-sm">
                            {order.invoice_number}
                          </span>
                          {getStatusBadge(order)}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600 mt-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {formatDate(order.start_date, "dd MMM")} -{" "}
                              {formatDate(order.end_date, "dd MMM")}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <IndianRupee className="h-3 w-3" />
                            <span className="font-semibold text-green-600">
                              {formatCurrency(order.total_amount)}
                            </span>
                          </div>
                        </div>
                        {order.created_at && (
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(order.created_at, "dd MMM yyyy, hh:mm a")}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No orders yet</p>
              <p className="text-sm text-gray-400 mt-1">
                This customer hasn't placed any orders
              </p>
            </div>
          )}
        </Card>
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
