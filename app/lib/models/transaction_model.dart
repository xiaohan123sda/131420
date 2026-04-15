import 'package:equatable/equatable.dart';

class TransactionModel extends Equatable {
  final int id;
  final String platform;
  final String? externalId;
  final String? tradeNo;
  final double amount;
  final String type; // income / expense
  final String? merchantName;
  final DateTime tradeTime;
  final String? payMethod;
  final String? categoryBig;
  final String? categorySmall;
  final double? categoryConfidence;
  final String? userCategoryOverride;
  final int isNecessary; // -1未标记 0非必要 1必要
  final String? notes;
  final int isAnomaly;
  final String? anomalyReason;
  final String syncStatus;
  final DateTime createdAt;

  const TransactionModel({
    required this.id,
    required this.platform,
    this.externalId,
    this.tradeNo,
    required this.amount,
    required this.type,
    this.merchantName,
    required this.tradeTime,
    this.payMethod,
    this.categoryBig,
    this.categorySmall,
    this.categoryConfidence,
    this.userCategoryOverride,
    this.isNecessary = -1,
    this.notes,
    this.isAnomaly = 0,
    this.anomalyReason,
    this.syncStatus = 'success',
    required this.createdAt,
  });

  factory TransactionModel.fromJson(Map<String, dynamic> json) {
    return TransactionModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      platform: json['platform'] ?? 'other',
      externalId: json['externalId'],
      tradeNo: json['tradeNo'],
      amount: double.parse(json['amount'].toString()),
      type: json['type'] ?? 'expense',
      merchantName: json['merchantName'],
      tradeTime: DateTime.parse(json['tradeTime']),
      payMethod: json['payMethod'],
      categoryBig: json['categoryBig'],
      categorySmall: json['categorySmall'],
      categoryConfidence: json['categoryConfidence'] != null
          ? double.parse(json['categoryConfidence'].toString())
          : null,
      userCategoryOverride: json['userCategoryOverride'],
      isNecessary: json['isNecessary'] ?? -1,
      notes: json['notes'],
      isAnomaly: json['isAnomaly'] ?? 0,
      anomalyReason: json['anomalyReason'],
      syncStatus: json['syncStatus'] ?? 'success',
      createdAt: DateTime.parse(json['createdAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'platform': platform,
      'externalId': externalId,
      'tradeNo': tradeNo,
      'amount': amount,
      'type': type,
      'merchantName': merchantName,
      'tradeTime': tradeTime.toIso8601String(),
      'payMethod': payMethod,
      'categoryBig': categoryBig,
      'categorySmall': categorySmall,
      'categoryConfidence': categoryConfidence,
      'userCategoryOverride': userCategoryOverride,
      'isNecessary': isNecessary,
      'notes': notes,
      'isAnomaly': isAnomaly,
      'anomalyReason': anomalyReason,
      'syncStatus': syncStatus,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  TransactionModel copyWith({
    int? id,
    String? platform,
    String? externalId,
    String? tradeNo,
    double? amount,
    String? type,
    String? merchantName,
    DateTime? tradeTime,
    String? payMethod,
    String? categoryBig,
    String? categorySmall,
    double? categoryConfidence,
    String? userCategoryOverride,
    int? isNecessary,
    String? notes,
    int? isAnomaly,
    String? anomalyReason,
    String? syncStatus,
    DateTime? createdAt,
  }) {
    return TransactionModel(
      id: id ?? this.id,
      platform: platform ?? this.platform,
      externalId: externalId ?? this.externalId,
      tradeNo: tradeNo ?? this.tradeNo,
      amount: amount ?? this.amount,
      type: type ?? this.type,
      merchantName: merchantName ?? this.merchantName,
      tradeTime: tradeTime ?? this.tradeTime,
      payMethod: payMethod ?? this.payMethod,
      categoryBig: categoryBig ?? this.categoryBig,
      categorySmall: categorySmall ?? this.categorySmall,
      categoryConfidence: categoryConfidence ?? this.categoryConfidence,
      userCategoryOverride: userCategoryOverride ?? this.userCategoryOverride,
      isNecessary: isNecessary ?? this.isNecessary,
      notes: notes ?? this.notes,
      isAnomaly: isAnomaly ?? this.isAnomaly,
      anomalyReason: anomalyReason ?? this.anomalyReason,
      syncStatus: syncStatus ?? this.syncStatus,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  List<Object?> get props => [id, platform, externalId, amount, type, tradeTime];
}
