import 'package:flutter/material.dart';
import 'package:auto_accountant/core/theme/app_theme.dart';
import 'package:auto_accountant/core/utils/format_utils.dart';
import 'package:auto_accountant/models/transaction_model.dart';

class RecentTransactions extends StatelessWidget {
  const RecentTransactions({super.key});

  @override
  Widget build(BuildContext context) {
    // TODO: 从Provider获取实际数据
    final transactions = _mockTransactions;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 标题
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  '近期账单',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                TextButton(
                  onPressed: () {
                    // TODO: 跳转全部账单
                  },
                  child: const Text('查看全部'),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // 账单列表
            if (transactions.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(20),
                  child: Text(
                    '暂无账单记录',
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
              )
            else
              ...transactions.map((t) => _buildTransactionItem(context, t)),
          ],
        ),
      ),
    );
  }

  Widget _buildTransactionItem(BuildContext context, TransactionModel transaction) {
    return InkWell(
      onTap: () {
        // TODO: 跳转账单详情
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            // 平台图标
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: _getPlatformColor(transaction.platform).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                _getPlatformIcon(transaction.platform),
                color: _getPlatformColor(transaction.platform),
                size: 22,
              ),
            ),
            const SizedBox(width: 12),

            // 信息
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    transaction.merchantName ?? '未知商户',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        FormatUtils.formatRelativeDate(transaction.tradeTime),
                        style: const TextStyle(
                          color: Colors.grey,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: _getPlatformColor(transaction.platform).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          _getPlatformName(transaction.platform),
                          style: TextStyle(
                            color: _getPlatformColor(transaction.platform),
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // 金额
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '-¥${transaction.amount.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.expenseColor,
                  ),
                ),
                if (transaction.categoryBig != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    transaction.categoryBig!,
                    style: const TextStyle(
                      color: Colors.grey,
                      fontSize: 11,
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _getPlatformColor(String platform) {
    switch (platform.toLowerCase()) {
      case 'wechat':
        return const Color(0xFF07C160);
      case 'alipay':
        return const Color(0xFF1677FF);
      case 'huabei':
        return const Color(0xFFFF9500);
      case 'pinduoduo':
        return const Color(0xFFFF4500);
      default:
        return Colors.grey;
    }
  }

  IconData _getPlatformIcon(String platform) {
    switch (platform.toLowerCase()) {
      case 'wechat':
        return Icons.chat_bubble;
      case 'alipay':
        return Icons.payment;
      case 'huabei':
        return Icons.credit_card;
      case 'pinduoduo':
        return Icons.shopping_bag;
      default:
        return Icons.account_balance_wallet;
    }
  }

  String _getPlatformName(String platform) {
    switch (platform.toLowerCase()) {
      case 'wechat':
        return '微信';
      case 'alipay':
        return '支付宝';
      case 'huabei':
        return '花呗';
      case 'pinduoduo':
        return '拼多多';
      default:
        return platform;
    }
  }

  List<TransactionModel> get _mockTransactions => [
    TransactionModel(
      id: 1,
      platform: 'wechat',
      merchantName: '星巴克咖啡',
      amount: 42.0,
      tradeTime: DateTime.now().subtract(const Duration(hours: 2)),
      categoryBig: '餐饮',
      categorySmall: '饮品',
    ),
    TransactionModel(
      id: 2,
      platform: 'alipay',
      merchantName: '美团外卖',
      amount: 35.5,
      tradeTime: DateTime.now().subtract(const Duration(hours: 5)),
      categoryBig: '餐饮',
      categorySmall: '外卖',
    ),
    TransactionModel(
      id: 3,
      platform: 'huabei',
      merchantName: '淘宝-数码配件',
      amount: 199.0,
      tradeTime: DateTime.now().subtract(const Duration(days: 1)),
      categoryBig: '购物',
      categorySmall: '日用品',
    ),
  ];
}
