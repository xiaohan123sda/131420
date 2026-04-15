import 'package:intl/intl.dart';

class FormatUtils {
  /// 格式化金额
  static String formatAmount(double amount, {String prefix = '¥'}) {
    return '$prefix${amount.toStringAsFixed(2)}';
  }

  /// 格式化日期
  static String formatDate(DateTime date, {String format = 'yyyy-MM-dd'}) {
    return DateFormat(format).format(date);
  }

  /// 格式化时间
  static String formatDateTime(DateTime date) {
    return DateFormat('yyyy-MM-dd HH:mm').format(date);
  }

  /// 相对时间（今天、昨天、具体日期）
  static String formatRelativeDate(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final targetDate = DateTime(date.year, date.month, date.day);
    final difference = today.difference(targetDate).inDays;

    if (difference == 0) {
      return '今天';
    } else if (difference == 1) {
      return '昨天';
    } else if (difference == 2) {
      return '前天';
    } else if (difference < 7) {
      return '$difference天前';
    } else {
      return formatDate(date, format: 'MM-dd');
    }
  }

  /// 格式化月份
  static String formatMonth(int year, int month) {
    return '$year年$month月';
  }

  /// 数字千分位格式化
  static String formatNumber(num number) {
    return NumberFormat('#,##0.00').format(number);
  }

  /// 百分比格式化
  static String formatPercent(double value) {
    return '${(value * 100).toStringAsFixed(1)}%';
  }
}
