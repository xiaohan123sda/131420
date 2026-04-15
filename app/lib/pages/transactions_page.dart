import 'package:flutter/material.dart';
import 'package:auto_accountant/core/theme/app_theme.dart';
import 'package:auto_accountant/core/utils/format_utils.dart';
import 'package:auto_accountant/models/transaction_model.dart';

class TransactionsPage extends StatefulWidget {
  const TransactionsPage({super.key});

  @override
  State<TransactionsPage> createState() => _TransactionsPageState();
}

class _TransactionsPageState extends State<TransactionsPage> {
  String _selectedPeriod = 'month'; // week / month
  String? _selectedPlatform;
  String? _selectedCategory;
  final _searchController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('收支明细'),
        actions: [
          IconButton(
            onPressed: () {
              // TODO: 导出账单
            },
            icon: const Icon(Icons.file_download_outlined),
          ),
        ],
      ),
      body: Column(
        children: [
          // 筛选栏
          Container(
            padding: const EdgeInsets.all(16),
            color: Theme.of(context).cardColor,
            child: Column(
              children: [
                // 时间切换
                Row(
                  children: [
                    _buildPeriodChip('week', '按周'),
                    const SizedBox(width: 8),
                    _buildPeriodChip('month', '按月'),
                    const Spacer(),
                    _buildFilterChip(
                      icon: Icons.filter_list,
                      label: '筛选',
                      onTap: _showFilterSheet,
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                
                // 搜索框
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: '搜索商户、备注...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {});
                            },
                          )
                        : null,
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ],
            ),
          ),

          // 账单列表
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _mockTransactions.length + 1,
              itemBuilder: (context, index) {
                if (index == 0) {
                  return _buildSummaryHeader();
                }
                return _buildTransactionCard(_mockTransactions[index - 1]);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPeriodChip(String value, String label) {
    final isSelected = _selectedPeriod == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        if (selected) {
          setState(() => _selectedPeriod = value);
        }
      },
      selectedColor: AppTheme.primaryColor.withValues(alpha: 0.2),
      labelStyle: TextStyle(
        color: isSelected ? AppTheme.primaryColor : Colors.grey,
        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
      ),
    );
  }

  Widget _buildFilterChip({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: Colors.grey),
            const SizedBox(width: 4),
            Text(label, style: const TextStyle(fontSize: 13)),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryHeader() {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.primaryColor.withValues(alpha: 0.1),
            AppTheme.primaryColor.withValues(alpha: 0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('本月支出', style: TextStyle(color: Colors.grey, fontSize: 13)),
                const SizedBox(height: 4),
                Text(
                  '¥8234.50',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppTheme.expenseColor,
                  ),
                ),
              ],
            ),
          ),
          Container(width: 1, height: 40, color: Colors.grey.shade300),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(left: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('本月收入', style: TextStyle(color: Colors.grey, fontSize: 13)),
                  const SizedBox(height: 4),
                  Text(
                    '¥15000.00',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppTheme.incomeColor,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTransactionCard(TransactionModel transaction) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _showTransactionDetail(transaction),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // 平台图标
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: _getPlatformColor(transaction.platform).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _getPlatformIcon(transaction.platform),
                  color: _getPlatformColor(transaction.platform),
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
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                          FormatUtils.formatRelativeDate(transaction.tradeTime),
                          style: const TextStyle(color: Colors.grey, fontSize: 12),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: (transaction.categoryBig != null
                                    ? AppTheme.categoryColors[transaction.categoryBig]
                                    : Colors.grey)
                                ?.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            transaction.categoryBig ?? '未分类',
                            style: TextStyle(
                              fontSize: 10,
                              color: AppTheme.categoryColors[transaction.categoryBig] ?? Colors.grey,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              
              // 金额
              Text(
                '${transaction.type == 'income' ? '+' : '-'}¥${transaction.amount.toStringAsFixed(2)}',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: transaction.type == 'income' ? AppTheme.incomeColor : AppTheme.expenseColor,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showFilterSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('筛选条件', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            const Text('支付平台', style: TextStyle(fontWeight: FontWeight.w500)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: [
                _buildPlatformChip('全部', null),
                _buildPlatformChip('微信', 'wechat'),
                _buildPlatformChip('支付宝', 'alipay'),
                _buildPlatformChip('花呗', 'huabei'),
                _buildPlatformChip('拼多多', 'pinduoduo'),
              ],
            ),
            const SizedBox(height: 20),
            const Text('消费分类', style: TextStyle(fontWeight: FontWeight.w500)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: [
                _buildPlatformChip('全部', null),
                ...['餐饮', '购物', '交通', '人情往来', '居家缴费', '其他'].map(
                  (c) => _buildPlatformChip(c, c),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      setState(() {
                        _selectedPlatform = null;
                        _selectedCategory = null;
                      });
                      Navigator.pop(context);
                    },
                    child: const Text('重置'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('确定'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlatformChip(String label, String? value) {
    final isSelected = (_selectedPlatform ?? value) == value;
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        setState(() {
          _selectedPlatform = selected ? value : null;
        });
      },
      selectedColor: AppTheme.primaryColor.withValues(alpha: 0.2),
    );
  }

  void _showTransactionDetail(TransactionModel transaction) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.4,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Center(
                child: Text(
                  '-¥${transaction.amount.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.expenseColor,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Center(
                child: Text(
                  transaction.merchantName ?? '未知商户',
                  style: const TextStyle(fontSize: 16, color: Colors.grey),
                ),
              ),
              const SizedBox(height: 32),
              _buildDetailRow('交易时间', FormatUtils.formatDateTime(transaction.tradeTime)),
              _buildDetailRow('支付方式', _getPlatformName(transaction.platform)),
              _buildDetailRow('分类', transaction.categoryBig ?? '未分类'),
              _buildDetailRow('同步状态', transaction.syncStatus == 'success' ? '已同步' : '同步中'),
              if (transaction.notes != null) _buildDetailRow('备注', transaction.notes!),
              const SizedBox(height: 32),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        // TODO: 修改分类
                      },
                      icon: const Icon(Icons.edit),
                      label: const Text('修改分类'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        // TODO: 添加备注
                      },
                      icon: const Icon(Icons.note_add),
                      label: const Text('添加备注'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Color _getPlatformColor(String platform) {
    switch (platform.toLowerCase()) {
      case 'wechat': return const Color(0xFF07C160);
      case 'alipay': return const Color(0xFF1677FF);
      case 'huabei': return const Color(0xFFFF9500);
      case 'pinduoduo': return const Color(0xFFFF4500);
      default: return Colors.grey;
    }
  }

  IconData _getPlatformIcon(String platform) {
    switch (platform.toLowerCase()) {
      case 'wechat': return Icons.chat_bubble;
      case 'alipay': return Icons.payment;
      case 'huabei': return Icons.credit_card;
      case 'pinduoduo': return Icons.shopping_bag;
      default: return Icons.account_balance_wallet;
    }
  }

  String _getPlatformName(String platform) {
    switch (platform.toLowerCase()) {
      case 'wechat': return '微信支付';
      case 'alipay': return '支付宝';
      case 'huabei': return '花呗';
      case 'pinduoduo': return '拼多多支付';
      default: return platform;
    }
  }

  List<TransactionModel> get _mockTransactions => [
    TransactionModel(
      id: 1,
      platform: 'wechat',
      merchantName: '星巴克咖啡',
      amount: 42.0,
      type: 'expense',
      tradeTime: DateTime.now().subtract(const Duration(hours: 2)),
      categoryBig: '餐饮',
    ),
    TransactionModel(
      id: 2,
      platform: 'alipay',
      merchantName: '美团外卖',
      amount: 35.5,
      type: 'expense',
      tradeTime: DateTime.now().subtract(const Duration(hours: 5)),
      categoryBig: '餐饮',
    ),
    TransactionModel(
      id: 3,
      platform: 'huabei',
      merchantName: '淘宝-数码配件',
      amount: 199.0,
      type: 'expense',
      tradeTime: DateTime.now().subtract(const Duration(days: 1)),
      categoryBig: '购物',
    ),
  ];
}
