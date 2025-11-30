# Glanz Rental - Flutter Mobile App Development Guide

**Version:** 1.0.0  
**Last Updated:** 2025-01-XX  
**Purpose:** Comprehensive Flutter development guide for implementing the Glanz Rental mobile application

---

## Table of Contents

1. [Overview](#overview)
2. [Flutter Setup & Architecture](#flutter-setup--architecture)
3. [Project Structure](#project-structure)
4. [Dependencies & Packages](#dependencies--packages)
5. [Database Schema](#database-schema)
6. [Supabase Integration](#supabase-integration)
7. [State Management](#state-management)
8. [API Services & Repositories](#api-services--repositories)
9. [Business Logic](#business-logic)
10. [UI Components & Screens](#ui-components--screens)
11. [User Flows & Navigation](#user-flows--navigation)
12. [Authentication & Authorization](#authentication--authorization)
13. [Real-time Updates](#real-time-updates)
14. [Error Handling](#error-handling)
15. [Image Handling & Storage](#image-handling--storage)
16. [Testing](#testing)
17. [Deployment](#deployment)

---

## Overview

Glanz Rental is a rental management system that allows staff members to:
- Create and manage rental orders
- Track customer information and KYC verification
- Manage rental items with photos
- Calculate rental costs with GST support
- Track order status (active, pending return, completed, cancelled)
- Generate invoices

### Key Features

- **Order Management**: Create, view, edit, and cancel orders
- **Customer Management**: Search, create, and manage customers with KYC verification
- **Item Management**: Add items with photos, quantities, and pricing
- **GST Calculation**: Configurable GST rates (included/excluded)
- **Real-time Updates**: Live order status updates using Supabase Realtime
- **Multi-branch Support**: Branch-based access control

---

## Flutter Setup & Architecture

### Flutter Version Requirements

- **Flutter SDK**: 3.16.0 or higher
- **Dart SDK**: 3.2.0 or higher
- **Platform Support**: iOS 12.0+, Android API 21+

### Recommended Architecture Pattern

```
┌─────────────────────────────────────────┐
│      Flutter App (Presentation)        │
│  ┌───────────────────────────────────┐ │
│  │   UI Layer (Widgets/Screens)      │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │   State Management (Provider)     │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │   Business Logic (Services)       │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │   Data Layer (Repositories)      │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │   Supabase Client (API)           │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Architecture Layers

1. **Presentation Layer**: Widgets, Screens, UI Components
2. **State Management Layer**: Provider/Riverpod/Bloc for state
3. **Business Logic Layer**: Services, Use Cases, ViewModels
4. **Data Layer**: Repositories, Data Sources, Models
5. **Infrastructure Layer**: Supabase Client, Local Storage

---

## Project Structure

### Recommended Folder Structure

```
lib/
├── main.dart
├── app/
│   ├── app.dart                    # Main app widget
│   └── routes.dart                 # Route definitions
├── core/
│   ├── constants/
│   │   ├── app_constants.dart      # App-wide constants
│   │   └── api_constants.dart      # API endpoints
│   ├── theme/
│   │   ├── app_theme.dart          # Theme configuration
│   │   └── app_colors.dart         # Color definitions
│   ├── utils/
│   │   ├── validators.dart         # Form validators
│   │   ├── date_utils.dart         # Date utilities
│   │   └── currency_formatter.dart # Currency formatting
│   └── errors/
│       ├── exceptions.dart          # Custom exceptions
│       └── failures.dart            # Failure classes
├── data/
│   ├── models/
│   │   ├── customer_model.dart
│   │   ├── order_model.dart
│   │   ├── order_item_model.dart
│   │   └── user_model.dart
│   ├── repositories/
│   │   ├── customer_repository.dart
│   │   ├── order_repository.dart
│   │   └── auth_repository.dart
│   └── data_sources/
│       ├── supabase_customer_source.dart
│       ├── supabase_order_source.dart
│       └── local_storage_source.dart
├── domain/
│   ├── entities/
│   │   ├── customer.dart
│   │   ├── order.dart
│   │   └── user.dart
│   └── use_cases/
│       ├── create_order_use_case.dart
│       ├── get_customers_use_case.dart
│       └── calculate_gst_use_case.dart
├── presentation/
│   ├── providers/
│   │   ├── auth_provider.dart
│   │   ├── order_provider.dart
│   │   └── customer_provider.dart
│   ├── screens/
│   │   ├── auth/
│   │   │   └── login_screen.dart
│   │   ├── orders/
│   │   │   ├── orders_list_screen.dart
│   │   │   ├── create_order_screen.dart
│   │   │   └── order_detail_screen.dart
│   │   └── customers/
│   │       ├── customers_list_screen.dart
│   │       └── create_customer_screen.dart
│   └── widgets/
│       ├── order/
│       │   ├── order_form_section.dart
│       │   ├── order_items_section.dart
│       │   └── order_summary_section.dart
│       └── common/
│           ├── custom_button.dart
│           ├── custom_text_field.dart
│           └── loading_indicator.dart
└── services/
    ├── supabase_service.dart       # Supabase initialization
    ├── storage_service.dart         # File storage service
    └── notification_service.dart    # Push notifications
```

---

## Dependencies & Packages

### `pubspec.yaml` Configuration

```yaml
name: glanz_rental
description: Glanz Rental Management Mobile App
version: 1.0.0+1

environment:
  sdk: '>=3.2.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

  # Supabase
  supabase_flutter: ^2.5.0
  
  # State Management
  provider: ^6.1.1
  # OR use Riverpod
  # flutter_riverpod: ^2.4.9
  # OR use Bloc
  # flutter_bloc: ^8.1.3
  
  # Navigation
  go_router: ^13.0.0
  # OR use auto_route
  # auto_route: ^7.3.0
  
  # UI Components
  flutter_svg: ^2.0.9
  cached_network_image: ^3.3.0
  image_picker: ^1.0.7
  image_cropper: ^5.0.1
  
  # Date & Time
  intl: ^0.19.0
  timeago: ^3.6.0
  
  # Forms & Validation
  flutter_form_builder: ^9.1.1
  form_builder_validators: ^9.1.0
  
  # Storage & Caching
  shared_preferences: ^2.2.2
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  
  # HTTP & Networking
  dio: ^5.4.0
  
  # Utilities
  equatable: ^2.0.5
  freezed_annotation: ^2.4.1
  json_annotation: ^4.8.1
  
  # PDF Generation
  pdf: ^3.10.7
  printing: ^5.12.0
  
  # Permissions
  permission_handler: ^11.1.0
  
  # Image Compression
  flutter_image_compress: ^2.1.0
  
  # Loading & Animations
  flutter_spinkit: ^5.2.0
  shimmer: ^3.0.0
  
  # Error Handling
  logger: ^2.0.2+1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.1
  build_runner: ^2.4.7
  freezed: ^2.4.6
  json_serializable: ^6.7.1
  mockito: ^5.4.4
  bloc_test: ^9.1.5

flutter:
  uses-material-design: true
  
  assets:
    - assets/images/
    - assets/icons/
  
  fonts:
    - family: Inter
      fonts:
        - asset: assets/fonts/Inter-Regular.ttf
        - asset: assets/fonts/Inter-Medium.ttf
          weight: 500
        - asset: assets/fonts/Inter-SemiBold.ttf
          weight: 600
        - asset: assets/fonts/Inter-Bold.ttf
          weight: 700
```

### Package Installation

```bash
flutter pub get
```

---

## Database Schema

### Models Overview

The database schema matches the web application. Here are the Flutter model representations:

### Customer Model

```dart
// lib/data/models/customer_model.dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'customer_model.freezed.dart';
part 'customer_model.g.dart';

@freezed
class CustomerModel with _$CustomerModel {
  const factory CustomerModel({
    required String id,
    String? customerNumber, // Format: GLA-00001
    required String name,
    required String phone, // Exactly 10 digits
    String? email,
    String? address,
    String? idProofType, // 'aadhar', 'passport', 'voter', 'others'
    String? idProofNumber,
    String? idProofFrontUrl,
    String? idProofBackUrl,
    DateTime? createdAt,
  }) = _CustomerModel;

  factory CustomerModel.fromJson(Map<String, dynamic> json) =>
      _$CustomerModelFromJson(json);
}

extension CustomerModelX on CustomerModel {
  bool get isVerified {
    return idProofNumber != null ||
        idProofFrontUrl != null ||
        idProofBackUrl != null;
  }
}
```

### Order Model

```dart
// lib/data/models/order_model.dart
import 'package:freezed_annotation/freezed_annotation.dart';
import 'customer_model.dart';
import 'order_item_model.dart';

part 'order_model.freezed.dart';
part 'order_model.g.dart';

enum OrderStatus {
  @JsonValue('active')
  active,
  @JsonValue('pending_return')
  pendingReturn,
  @JsonValue('completed')
  completed,
  @JsonValue('cancelled')
  cancelled,
}

@freezed
class OrderModel with _$OrderModel {
  const factory OrderModel({
    required String id,
    required String branchId,
    required String staffId,
    required String customerId,
    required String invoiceNumber,
    required DateTime startDate, // Legacy DATE field
    required DateTime endDate, // Legacy DATE field
    DateTime? startDateTime, // New TIMESTAMP field
    DateTime? endDateTime, // New TIMESTAMP field
    @Default(OrderStatus.active) OrderStatus status,
    required double totalAmount,
    double? subtotal,
    double? gstAmount,
    double? lateFee,
    DateTime? createdAt,
    CustomerModel? customer,
    List<OrderItemModel>? items,
  }) = _OrderModel;

  factory OrderModel.fromJson(Map<String, dynamic> json) =>
      _$OrderModelFromJson(json);
}

extension OrderModelX on OrderModel {
  String get orderCategory {
    if (status == OrderStatus.cancelled) return 'cancelled';
    if (status == OrderStatus.completed) return 'returned';
    
    final now = DateTime.now();
    final start = startDateTime ?? startDate;
    final end = endDateTime ?? endDate;
    
    if (now.isBefore(start)) return 'scheduled';
    if (now.isAfter(end)) return 'late';
    return 'ongoing';
  }
  
  bool get canCancel {
    return status == OrderStatus.active || 
           status == OrderStatus.pendingReturn;
  }
  
  bool get canMarkReturned {
    final category = orderCategory;
    return category == 'ongoing' || category == 'late';
  }
}
```

### Order Item Model

```dart
// lib/data/models/order_item_model.dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'order_item_model.freezed.dart';
part 'order_item_model.g.dart';

@freezed
class OrderItemModel with _$OrderItemModel {
  const factory OrderItemModel({
    String? id,
    String? orderId,
    required String photoUrl,
    String? productName,
    @Default(1) int quantity,
    required double pricePerDay,
    required int days,
    required double lineTotal,
    DateTime? createdAt,
  }) = _OrderItemModel;

  factory OrderItemModel.fromJson(Map<String, dynamic> json) =>
      _$OrderItemModelFromJson(json);
}

extension OrderItemModelX on OrderItemModel {
  double calculateLineTotal() {
    return quantity * pricePerDay;
  }
}
```

### User Model

```dart
// lib/data/models/user_model.dart
import 'package:freezed_annotation/freezed_annotation.dart';
import 'branch_model.dart';

part 'user_model.freezed.dart';
part 'user_model.g.dart';

enum UserRole {
  @JsonValue('super_admin')
  superAdmin,
  @JsonValue('branch_admin')
  branchAdmin,
  @JsonValue('staff')
  staff,
}

@freezed
class UserModel with _$UserModel {
  const factory UserModel({
    required String id,
    required String username,
    required UserRole role,
    String? branchId,
    required String fullName,
    required String phone,
    String? gstNumber,
    @Default(false) bool gstEnabled,
    @Default(5.0) double gstRate,
    @Default(false) bool gstIncluded,
    String? upiId,
    BranchModel? branch,
  }) = _UserModel;

  factory UserModel.fromJson(Map<String, dynamic> json) =>
      _$UserModelFromJson(json);
}
```

### Generate Model Files

After creating models, run:

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

This generates the `freezed` and `json_serializable` code.

---

## Supabase Integration

### Initialize Supabase

```dart
// lib/services/supabase_service.dart
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseService {
  static Future<void> initialize() async {
    await Supabase.initialize(
      url: 'YOUR_SUPABASE_URL',
      anonKey: 'YOUR_SUPABASE_ANON_KEY',
      debug: false, // Set to true for development
    );
  }

  static SupabaseClient get client => Supabase.instance.client;
  
  static GoTrueClient get auth => Supabase.instance.client.auth;
  
  static RealtimeClient get realtime => Supabase.instance.client.realtime;
  
  static StorageClient get storage => Supabase.instance.client.storage;
}
```

### Initialize in `main.dart`

```dart
// lib/main.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/supabase_service.dart';
import 'app/app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Supabase
  await SupabaseService.initialize();
  
  runApp(const MyApp());
}
```

---

## State Management

### Using Provider (Recommended)

#### Auth Provider

```dart
// lib/presentation/providers/auth_provider.dart
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../data/models/user_model.dart';
import '../../services/supabase_service.dart';

class AuthProvider with ChangeNotifier {
  UserModel? _user;
  bool _isLoading = false;
  String? _error;

  UserModel? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;

  Future<bool> login(String email, String password) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final response = await SupabaseService.auth.signInWithPassword(
        email: email,
        password: password,
      );

      if (response.user != null) {
        await _loadUserProfile(response.user!.id);
        return true;
      }
      return false;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _loadUserProfile(String userId) async {
    final response = await SupabaseService.client
        .from('profiles')
        .select('*, branch:branches(*)')
        .eq('id', userId)
        .single();

    _user = UserModel.fromJson(response);
    notifyListeners();
  }

  Future<void> logout() async {
    await SupabaseService.auth.signOut();
    _user = null;
    notifyListeners();
  }

  Future<void> checkAuthStatus() async {
    final session = SupabaseService.auth.currentSession;
    if (session != null && session.user != null) {
      await _loadUserProfile(session.user!.id);
    }
  }
}
```

#### Order Provider

```dart
// lib/presentation/providers/order_provider.dart
import 'package:flutter/foundation.dart';
import '../../data/models/order_model.dart';
import '../../data/repositories/order_repository.dart';

class OrderProvider with ChangeNotifier {
  final OrderRepository _repository;

  OrderProvider(this._repository);

  List<OrderModel> _orders = [];
  bool _isLoading = false;
  String? _error;
  int _currentPage = 1;
  bool _hasMore = true;

  List<OrderModel> get orders => _orders;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasMore => _hasMore;

  Future<void> loadOrders({
    required String branchId,
    String? status,
    String? searchQuery,
    DateTime? startDate,
    DateTime? endDate,
    bool refresh = false,
  }) async {
    try {
      if (refresh) {
        _currentPage = 1;
        _orders = [];
        _hasMore = true;
      }

      _isLoading = true;
      _error = null;
      notifyListeners();

      final result = await _repository.getOrders(
        branchId: branchId,
        page: _currentPage,
        pageSize: 20,
        status: status,
        searchQuery: searchQuery,
        startDate: startDate,
        endDate: endDate,
      );

      if (refresh) {
        _orders = result.data;
      } else {
        _orders.addAll(result.data);
      }

      _hasMore = result.data.length == 20;
      _currentPage++;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<OrderModel?> createOrder({
    required String branchId,
    required String staffId,
    required String customerId,
    required String invoiceNumber,
    required DateTime startDate,
    required DateTime endDate,
    required double totalAmount,
    double? subtotal,
    double? gstAmount,
    required List<Map<String, dynamic>> items,
  }) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final order = await _repository.createOrder(
        branchId: branchId,
        staffId: staffId,
        customerId: customerId,
        invoiceNumber: invoiceNumber,
        startDate: startDate,
        endDate: endDate,
        totalAmount: totalAmount,
        subtotal: subtotal,
        gstAmount: gstAmount,
        items: items,
      );

      _orders.insert(0, order);
      notifyListeners();
      return order;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> cancelOrder(String orderId) async {
    try {
      await _repository.updateOrderStatus(orderId, OrderStatus.cancelled);
      final index = _orders.indexWhere((o) => o.id == orderId);
      if (index != -1) {
        _orders[index] = _orders[index].copyWith(status: OrderStatus.cancelled);
        notifyListeners();
      }
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> markOrderReturned(String orderId) async {
    try {
      await _repository.updateOrderStatus(orderId, OrderStatus.completed);
      final index = _orders.indexWhere((o) => o.id == orderId);
      if (index != -1) {
        _orders[index] = _orders[index].copyWith(status: OrderStatus.completed);
        notifyListeners();
      }
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
}
```

### Provider Setup in App

```dart
// lib/app/app.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../presentation/providers/auth_provider.dart';
import '../presentation/providers/order_provider.dart';
import '../presentation/providers/customer_provider.dart';
import '../data/repositories/order_repository.dart';
import '../data/repositories/customer_repository.dart';
import 'routes.dart';

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(
          create: (_) => OrderProvider(OrderRepository()),
        ),
        ChangeNotifierProvider(
          create: (_) => CustomerProvider(CustomerRepository()),
        ),
      ],
      child: MaterialApp.router(
        title: 'Glanz Rental',
        theme: ThemeData(
          primarySwatch: Colors.blue,
          useMaterial3: true,
        ),
        routerConfig: AppRoutes.router,
      ),
    );
  }
}
```

---

## API Services & Repositories

### Order Repository

```dart
// lib/data/repositories/order_repository.dart
import '../../services/supabase_service.dart';
import '../models/order_model.dart';
import '../models/order_item_model.dart';

class OrderRepository {
  final _client = SupabaseService.client;

  Future<PaginatedResult<OrderModel>> getOrders({
    required String branchId,
    int page = 1,
    int pageSize = 20,
    String? status,
    String? searchQuery,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final from = (page - 1) * pageSize;
    final to = from + pageSize - 1;

    var query = _client
        .from('orders')
        .select('''
          *,
          customer:customers(id, name, phone, customer_number),
          staff:profiles(id, full_name),
          branch:branches(id, name),
          items:order_items(*)
        ''')
        .eq('branch_id', branchId)
        .order('created_at', ascending: false)
        .range(from, to);

    // Filter by status
    if (status != null && status != 'all') {
      final orderStatus = status == 'pending' 
          ? 'pending_return' 
          : status;
      query = query.eq('status', orderStatus);
    }

    // Filter by date range
    if (startDate != null && endDate != null) {
      final startStr = startDate.toIso8601String().split('T')[0];
      final endStr = endDate.toIso8601String().split('T')[0];
      query = query
          .gte('created_at', startStr)
          .lte('created_at', '$endStrT23:59:59');
    }

    final response = await query;

    final orders = (response as List)
        .map((json) => OrderModel.fromJson(json))
        .toList();

    return PaginatedResult(
      data: orders,
      total: orders.length, // Supabase doesn't return count in range queries
      page: page,
      pageSize: pageSize,
    );
  }

  Future<OrderModel> createOrder({
    required String branchId,
    required String staffId,
    required String customerId,
    required String invoiceNumber,
    required DateTime startDate,
    required DateTime endDate,
    required double totalAmount,
    double? subtotal,
    double? gstAmount,
    required List<Map<String, dynamic>> items,
  }) async {
    // Prepare order data
    final startDateOnly = startDate.toIso8601String().split('T')[0];
    final endDateOnly = endDate.toIso8601String().split('T')[0];

    final orderData = {
      'branch_id': branchId,
      'staff_id': staffId,
      'customer_id': customerId,
      'invoice_number': invoiceNumber,
      'start_date': startDateOnly,
      'end_date': endDateOnly,
      'start_datetime': startDate.toIso8601String(),
      'end_datetime': endDate.toIso8601String(),
      'status': 'active',
      'total_amount': totalAmount,
      'subtotal': subtotal,
      'gst_amount': gstAmount,
    };

    // Create order
    final orderResponse = await _client
        .from('orders')
        .insert(orderData)
        .select('id')
        .single();

    final orderId = orderResponse['id'] as String;

    // Create order items
    final itemsData = items.map((item) => {
      return {
        ...item,
        'order_id': orderId,
        'product_name': item['product_name'] ?? null,
      };
    }).toList();

    await _client.from('order_items').insert(itemsData);

    // Return complete order
    return getOrderById(orderId);
  }

  Future<OrderModel> getOrderById(String orderId) async {
    final response = await _client
        .from('orders')
        .select('''
          *,
          customer:customers(*),
          staff:profiles(*),
          branch:branches(*),
          items:order_items(*)
        ''')
        .eq('id', orderId)
        .single();

    return OrderModel.fromJson(response);
  }

  Future<void> updateOrderStatus(String orderId, OrderStatus status) async {
    await _client
        .from('orders')
        .update({'status': status.name})
        .eq('id', orderId);
  }
}

class PaginatedResult<T> {
  final List<T> data;
  final int total;
  final int page;
  final int pageSize;

  PaginatedResult({
    required this.data,
    required this.total,
    required this.page,
    required this.pageSize,
  });

  int get totalPages => (total / pageSize).ceil();
}
```

### Customer Repository

```dart
// lib/data/repositories/customer_repository.dart
import '../../services/supabase_service.dart';
import '../models/customer_model.dart';

class CustomerRepository {
  final _client = SupabaseService.client;

  Future<PaginatedResult<CustomerModel>> getCustomers({
    String? searchQuery,
    int page = 1,
    int pageSize = 20,
  }) async {
    final from = (page - 1) * pageSize;
    final to = from + pageSize - 1;

    var query = _client
        .from('customers')
        .select('*', const FetchOptions(count: CountOption.exact))
        .order('created_at', ascending: false)
        .range(from, to);

    if (searchQuery != null && searchQuery.trim().isNotEmpty) {
      query = query.or(
        'name.ilike.%$searchQuery%,phone.ilike.%$searchQuery%',
      );
    }

    final response = await query;

    final customers = (response as List)
        .map((json) => CustomerModel.fromJson(json))
        .toList();

    return PaginatedResult(
      data: customers,
      total: response.length,
      page: page,
      pageSize: pageSize,
    );
  }

  Future<CustomerModel> createCustomer({
    required String name,
    required String phone,
    String? email,
    String? address,
    String? idProofType,
    String? idProofNumber,
    String? idProofFrontUrl,
    String? idProofBackUrl,
  }) async {
    // Validate phone number
    final phoneDigits = phone.replaceAll(RegExp(r'\D'), '');
    if (phoneDigits.length != 10) {
      throw Exception('Phone number must be exactly 10 digits');
    }

    final customerData = {
      'name': name.trim(),
      'phone': phoneDigits,
      'email': email?.trim(),
      'address': address?.trim(),
      'id_proof_type': idProofType,
      'id_proof_number': idProofNumber?.trim(),
      'id_proof_front_url': idProofFrontUrl,
      'id_proof_back_url': idProofBackUrl,
    };

    final response = await _client
        .from('customers')
        .insert(customerData)
        .select()
        .single();

    return CustomerModel.fromJson(response);
  }

  Future<CustomerModel> getCustomerById(String customerId) async {
    final response = await _client
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

    return CustomerModel.fromJson(response);
  }
}
```

---

## Business Logic

### GST Calculation Service

```dart
// lib/domain/services/gst_calculation_service.dart
class GSTCalculationService {
  static GSTResult calculateGST({
    required double subtotal,
    required bool enabled,
    required double rate,
    required bool included,
  }) {
    if (!enabled) {
      return GSTResult(
        subtotal: subtotal,
        gstAmount: 0,
        grandTotal: subtotal,
      );
    }

    final gstRate = rate / 100;

    if (included) {
      // GST is included in the price
      // If price is ₹105 with 5% GST included:
      // GST = 105 × (5/105) = 5
      // Base = 105 - 5 = 100
      final gstAmount = subtotal * (gstRate / (1 + gstRate));
      final grandTotal = subtotal; // Price already includes GST
      return GSTResult(
        subtotal: subtotal - gstAmount,
        gstAmount: gstAmount,
        grandTotal: grandTotal,
      );
    } else {
      // GST is added on top
      // If base is ₹100 with 5% GST:
      // GST = 100 × 0.05 = 5
      // Total = 100 + 5 = 105
      final gstAmount = subtotal * gstRate;
      final grandTotal = subtotal + gstAmount;
      return GSTResult(
        subtotal: subtotal,
        gstAmount: gstAmount,
        grandTotal: grandTotal,
      );
    }
  }
}

class GSTResult {
  final double subtotal;
  final double gstAmount;
  final double grandTotal;

  GSTResult({
    required this.subtotal,
    required this.gstAmount,
    required this.grandTotal,
  });
}
```

### Date Utilities

```dart
// lib/core/utils/date_utils.dart
import 'package:intl/intl.dart';

class DateUtils {
  static int calculateDays(DateTime startDate, DateTime endDate) {
    final difference = endDate.difference(startDate);
    return difference.inDays + 1; // Inclusive of both start and end days
  }

  static String formatDate(DateTime date, {String format = 'dd MMM yyyy'}) {
    return DateFormat(format).format(date);
  }

  static String formatDateTime(DateTime date) {
    return DateFormat('dd MMM yyyy, hh:mm a').format(date);
  }

  static bool isPastDate(DateTime date) {
    return date.isBefore(DateTime.now());
  }

  static bool isValidDateRange(DateTime start, DateTime end) {
    return end.isAfter(start) && !isPastDate(start) && !isPastDate(end);
  }
}
```

### Currency Formatter

```dart
// lib/core/utils/currency_formatter.dart
import 'package:intl/intl.dart';

class CurrencyFormatter {
  static String format(double amount) {
    return NumberFormat.currency(
      symbol: '₹',
      decimalDigits: 0,
      locale: 'en_IN',
    ).format(amount);
  }

  static String formatWithDecimals(double amount) {
    return NumberFormat.currency(
      symbol: '₹',
      decimalDigits: 2,
      locale: 'en_IN',
    ).format(amount);
  }
}
```

---

## UI Components & Screens

### Create Order Screen

```dart
// lib/presentation/screens/orders/create_order_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/order_provider.dart';
import '../../providers/customer_provider.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/order/order_form_section.dart';
import '../../widgets/order/order_datetime_section.dart';
import '../../widgets/order/order_items_section.dart';
import '../../widgets/order/order_summary_section.dart';
import '../../widgets/order/order_invoice_section.dart';

class CreateOrderScreen extends StatefulWidget {
  const CreateOrderScreen({super.key});

  @override
  State<CreateOrderScreen> createState() => _CreateOrderScreenState();
}

class _CreateOrderScreenState extends State<CreateOrderScreen> {
  final _formKey = GlobalKey<FormState>();
  final _invoiceController = TextEditingController();
  
  DateTime? _startDate;
  DateTime? _endDate;
  String? _selectedCustomerId;
  final List<OrderItemDraft> _items = [];

  @override
  void dispose() {
    _invoiceController.dispose();
    super.dispose();
  }

  Future<void> _handleSaveOrder() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCustomerId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a customer')),
      );
      return;
    }
    if (_items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please add at least one item')),
      );
      return;
    }

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final orderProvider = Provider.of<OrderProvider>(context, listen: false);
    final user = authProvider.user;

    if (user == null || user.branchId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('User information missing')),
      );
      return;
    }

    // Calculate totals
    final subtotal = _items.fold<double>(
      0,
      (sum, item) => sum + item.lineTotal,
    );

    final gstResult = GSTCalculationService.calculateGST(
      subtotal: subtotal,
      enabled: user.gstEnabled,
      rate: user.gstRate,
      included: user.gstIncluded,
    );

    // Prepare items for API
    final itemsData = _items.map((item) {
      final days = DateUtils.calculateDays(_startDate!, _endDate!);
      return {
        'photo_url': item.photoUrl,
        'product_name': item.productName,
        'quantity': item.quantity,
        'price_per_day': item.pricePerDay,
        'days': days,
        'line_total': item.lineTotal,
      };
    }).toList();

    final order = await orderProvider.createOrder(
      branchId: user.branchId!,
      staffId: user.id,
      customerId: _selectedCustomerId!,
      invoiceNumber: _invoiceController.text.trim(),
      startDate: _startDate!,
      endDate: _endDate!,
      totalAmount: gstResult.grandTotal,
      subtotal: gstResult.subtotal,
      gstAmount: gstResult.gstAmount,
      items: itemsData,
    );

    if (order != null && mounted) {
      Navigator.of(context).pop(true); // Return success
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;

    // Calculate totals
    final subtotal = _items.fold<double>(
      0,
      (sum, item) => sum + item.lineTotal,
    );

    final gstResult = user != null
        ? GSTCalculationService.calculateGST(
            subtotal: subtotal,
            enabled: user.gstEnabled,
            rate: user.gstRate,
            included: user.gstIncluded,
          )
        : GSTResult(
            subtotal: subtotal,
            gstAmount: 0,
            grandTotal: subtotal,
          );

    return Scaffold(
      appBar: AppBar(
        title: const Text('New Order'),
        actions: [
          TextButton(
            onPressed: _handleSaveOrder,
            child: const Text('Save'),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Customer Selection
            OrderFormSection(
              selectedCustomerId: _selectedCustomerId,
              onCustomerSelected: (customerId) {
                setState(() {
                  _selectedCustomerId = customerId;
                });
              },
              branchName: user?.branch?.name,
              staffName: user?.fullName,
            ),
            const SizedBox(height: 24),

            // Date/Time Selection
            OrderDateTimeSection(
              startDate: _startDate,
              endDate: _endDate,
              onStartDateChanged: (date) {
                setState(() {
                  _startDate = date;
                  if (_endDate != null && _endDate!.isBefore(date)) {
                    _endDate = null;
                  }
                });
              },
              onEndDateChanged: (date) {
                setState(() {
                  _endDate = date;
                });
              },
            ),
            const SizedBox(height: 24),

            // Items Section
            OrderItemsSection(
              items: _items,
              onItemAdded: (item) {
                setState(() {
                  _items.add(item);
                });
              },
              onItemUpdated: (index, item) {
                setState(() {
                  _items[index] = item;
                });
              },
              onItemRemoved: (index) {
                setState(() {
                  _items.removeAt(index);
                });
              },
              days: _startDate != null && _endDate != null
                  ? DateUtils.calculateDays(_startDate!, _endDate!)
                  : 0,
            ),
            const SizedBox(height: 24),

            // Order Summary
            if (gstResult.grandTotal > 0)
              OrderSummarySection(
                subtotal: gstResult.subtotal,
                gstAmount: gstResult.gstAmount,
                grandTotal: gstResult.grandTotal,
                gstEnabled: user?.gstEnabled ?? false,
                gstRate: user?.gstRate ?? 5.0,
                gstIncluded: user?.gstIncluded ?? false,
              ),
            const SizedBox(height: 24),

            // Invoice Number
            OrderInvoiceSection(
              controller: _invoiceController,
            ),
          ],
        ),
      ),
    );
  }
}

class OrderItemDraft {
  final String photoUrl;
  final String? productName;
  final int quantity;
  final double pricePerDay;
  final double lineTotal;

  OrderItemDraft({
    required this.photoUrl,
    this.productName,
    required this.quantity,
    required this.pricePerDay,
    required this.lineTotal,
  });
}
```

### Reusable Widget: Order Form Section

```dart
// lib/presentation/widgets/order/order_form_section.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../presentation/providers/customer_provider.dart';
import '../../customers/customer_search_widget.dart';

class OrderFormSection extends StatelessWidget {
  final String? selectedCustomerId;
  final Function(String) onCustomerSelected;
  final String? branchName;
  final String? staffName;

  const OrderFormSection({
    super.key,
    required this.selectedCustomerId,
    required this.onCustomerSelected,
    this.branchName,
    this.staffName,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Customer *',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        CustomerSearchWidget(
          selectedCustomerId: selectedCustomerId,
          onCustomerSelected: onCustomerSelected,
        ),
        if (branchName != null || staffName != null) ...[
          const SizedBox(height: 16),
          if (branchName != null) _buildReadOnlyField('Branch', branchName!),
          if (staffName != null) _buildReadOnlyField('Staff', staffName!),
        ],
      ],
    );
  }

  Widget _buildReadOnlyField(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 14,
              color: Colors.grey,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          Container(
            height: 40,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(8),
            ),
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: const TextStyle(fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }
}
```

---

## User Flows & Navigation

### Navigation Setup with GoRouter

```dart
// lib/app/routes.dart
import 'package:go_router/go_router.dart';
import '../presentation/screens/auth/login_screen.dart';
import '../presentation/screens/orders/orders_list_screen.dart';
import '../presentation/screens/orders/create_order_screen.dart';
import '../presentation/screens/orders/order_detail_screen.dart';
import '../presentation/screens/customers/customers_list_screen.dart';
import '../presentation/screens/customers/create_customer_screen.dart';

class AppRoutes {
  static final GoRouter router = GoRouter(
    initialLocation: '/login',
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/orders',
        builder: (context, state) => const OrdersListScreen(),
        routes: [
          GoRoute(
            path: 'new',
            builder: (context, state) => const CreateOrderScreen(),
          ),
          GoRoute(
            path: ':id',
            builder: (context, state) {
              final orderId = state.pathParameters['id']!;
              return OrderDetailScreen(orderId: orderId);
            },
          ),
        ],
      ),
      GoRoute(
        path: '/customers',
        builder: (context, state) => const CustomersListScreen(),
        routes: [
          GoRoute(
            path: 'new',
            builder: (context, state) => const CreateCustomerScreen(),
          ),
        ],
      ),
    ],
  );
}
```

---

## Authentication & Authorization

### Login Screen Implementation

```dart
// lib/presentation/screens/auth/login_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import 'package:go_router/go_router.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final success = await authProvider.login(
      _emailController.text.trim(),
      _passwordController.text,
    );

    if (success && mounted) {
      context.go('/orders');
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.error ?? 'Login failed'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    'Glanz Rental',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 48),
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter your email';
                      }
                      if (!value.contains('@')) {
                        return 'Please enter a valid email';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    decoration: InputDecoration(
                      labelText: 'Password',
                      border: const OutlineInputBorder(),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword
                              ? Icons.visibility
                              : Icons.visibility_off,
                        ),
                        onPressed: () {
                          setState(() {
                            _obscurePassword = !_obscurePassword;
                          });
                        },
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter your password';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: authProvider.isLoading ? null : _handleLogin,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: authProvider.isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Login'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
```

---

## Real-time Updates

### Real-time Order Updates

```dart
// lib/data/repositories/order_repository.dart (add this method)

Stream<List<OrderModel>> watchOrders(String branchId) {
  return _client
      .from('orders')
      .stream(primaryKey: ['id'])
      .eq('branch_id', branchId)
      .order('created_at', ascending: false)
      .map((data) => (data as List)
          .map((json) => OrderModel.fromJson(json))
          .toList());
}
```

### Using Real-time in Provider

```dart
// In OrderProvider, add this method:

void startListening(String branchId) {
  _repository.watchOrders(branchId).listen((orders) {
    _orders = orders;
    notifyListeners();
  });
}
```

---

## Error Handling

### Custom Exceptions

```dart
// lib/core/errors/exceptions.dart
class AppException implements Exception {
  final String message;
  final String? code;

  AppException(this.message, {this.code});

  @override
  String toString() => message;
}

class NetworkException extends AppException {
  NetworkException([String? message])
      : super(message ?? 'Network error occurred');
}

class AuthException extends AppException {
  AuthException([String? message])
      : super(message ?? 'Authentication failed');
}

class ValidationException extends AppException {
  ValidationException(String message) : super(message);
}
```

### Error Handler Widget

```dart
// lib/presentation/widgets/common/error_handler.dart
import 'package:flutter/material.dart';

class ErrorHandler {
  static void showError(BuildContext context, dynamic error) {
    String message = 'An error occurred';
    
    if (error is AppException) {
      message = error.message;
    } else if (error is String) {
      message = error;
    }
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 3),
      ),
    );
  }
}
```

---

## Image Handling & Storage

### Image Picker Service

```dart
// lib/services/image_picker_service.dart
import 'package:image_picker/image_picker.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'dart:io';
import 'package:supabase_flutter/supabase_flutter.dart';

class ImagePickerService {
  final _picker = ImagePicker();
  final _storage = Supabase.instance.client.storage;

  Future<String?> pickAndUploadImage({
    required String bucket,
    required String path,
    ImageSource source = ImageSource.camera,
    int quality = 85,
  }) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: source,
        imageQuality: quality,
      );

      if (image == null) return null;

      // Compress image
      final compressedBytes = await FlutterImageCompress.compressWithFile(
        image.path,
        quality: quality,
      );

      if (compressedBytes == null) return null;

      // Upload to Supabase Storage
      await _storage.from(bucket).uploadBinary(
        path,
        compressedBytes,
        fileOptions: const FileOptions(
          cacheControl: '3600',
          upsert: false,
        ),
      );

      // Get public URL
      final url = _storage.from(bucket).getPublicUrl(path);
      return url;
    } catch (e) {
      throw Exception('Failed to upload image: $e');
    }
  }
}
```

---

## Testing

### Unit Test Example

```dart
// test/domain/services/gst_calculation_service_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:glanz_rental/domain/services/gst_calculation_service.dart';

void main() {
  group('GSTCalculationService', () {
    test('should calculate GST correctly when included', () {
      final result = GSTCalculationService.calculateGST(
        subtotal: 105,
        enabled: true,
        rate: 5,
        included: true,
      );
      
      expect(result.gstAmount, closeTo(5, 0.01));
      expect(result.grandTotal, 105);
    });

    test('should calculate GST correctly when added on top', () {
      final result = GSTCalculationService.calculateGST(
        subtotal: 100,
        enabled: true,
        rate: 5,
        included: false,
      );
      
      expect(result.gstAmount, 5);
      expect(result.grandTotal, 105);
    });
  });
}
```

---

## Deployment

### Android Setup

1. Update `android/app/build.gradle`:
```gradle
android {
    compileSdkVersion 34
    
    defaultConfig {
        applicationId "com.glanz.rental"
        minSdkVersion 21
        targetSdkVersion 34
    }
}
```

### iOS Setup

1. Update `ios/Podfile`:
```ruby
platform :ios, '12.0'
```

2. Update `ios/Runner/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>We need access to your camera to take product photos</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library to select product images</string>
```

### Build Commands

```bash
# Android
flutter build apk --release
flutter build appbundle --release

# iOS
flutter build ios --release
```

---

## Additional Resources

- [Flutter Documentation](https://flutter.dev/docs)
- [Supabase Flutter Documentation](https://supabase.com/docs/guides/flutter)
- [Provider Package](https://pub.dev/packages/provider)
- [GoRouter Documentation](https://pub.dev/packages/go_router)

---

**Document Version:** 1.0.0  
**Last Updated:** 2025-01-XX

