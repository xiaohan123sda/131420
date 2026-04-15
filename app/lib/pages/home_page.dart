import 'package:flutter/material.dart';
import 'package:auto_accountant/core/theme/app_theme.dart';
import 'package:auto_accountant/core/utils/format_utils.dart';
import 'package:auto_accountant/widgets/salary_card.dart';
import 'package:auto_accountant/widgets/expense_chart.dart';
import 'package:auto_accountant/widgets/recent_transactions.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            // TODO: 刷新数据
            await Future.delayed(const Duration(seconds: 1));
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 顶部标题栏
                _buildHeader(context),
                const SizedBox(height: 20),
                
                // 工资概览卡片
                const SalaryCard(),
                const SizedBox(height: 20),
                
                // 消费结构图
                const ExpenseChart(),
                const SizedBox(height: 20),
                
                // 近期账单
                const RecentTransactions(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '随手记',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              FormatUtils.formatDate(DateTime.now(), format: 'yyyy年MM月'),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.grey,
              ),
            ),
          ],
        ),
        Row(
          children: [
            // 同步状态指示
            _buildSyncStatus(),
            const SizedBox(width: 8),
            IconButton(
              onPressed: () {
                // TODO: 同步账单
              },
              icon: const Icon(Icons.sync),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSyncStatus() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: AppTheme.primaryColor,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 4),
          const Text(
            '已同步',
            style: TextStyle(
              color: AppTheme.primaryColor,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}
