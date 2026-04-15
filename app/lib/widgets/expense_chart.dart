import 'package:flutter/material.dart';
import 'package:auto_accountant/core/theme/app_theme.dart';
import 'package:auto_accountant/core/utils/format_utils.dart';
import 'package:fl_chart/fl_chart.dart';

class ExpenseChart extends StatefulWidget {
  const ExpenseChart({super.key});

  @override
  State<ExpenseChart> createState() => _ExpenseChartState();
}

class _ExpenseChartState extends State<ExpenseChart> {
  int _touchedIndex = -1;

  // TODO: 从Provider获取实际数据
  final List<CategoryData> _categories = [
    CategoryData('餐饮', 2500.0, const Color(0xFFFF7043)),
    CategoryData('购物', 1800.0, const Color(0xFFAB47BC)),
    CategoryData('交通', 600.0, const Color(0xFF42A5F5)),
    CategoryData('人情往来', 1200.0, const Color(0xFFEC407A)),
    CategoryData('居家缴费', 1500.0, const Color(0xFF26A69A)),
    CategoryData('其他', 634.5, const Color(0xFF78909C)),
  ];

  @override
  Widget build(BuildContext context) {
    final total = _categories.fold(0.0, (sum, c) => sum + c.amount);
    
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
                  '消费结构',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                TextButton(
                  onPressed: () {
                    // TODO: 查看全部分类
                  },
                  child: const Text('查看全部'),
                ),
              ],
            ),
            const SizedBox(height: 20),
            
            // 饼图 + 图例
            Row(
              children: [
                // 饼图
                SizedBox(
                  width: 140,
                  height: 140,
                  child: PieChart(
                    PieChartData(
                      pieTouchData: PieTouchData(
                        touchCallback: (event, response) {
                          setState(() {
                            if (!event.isInterestedForInteractions ||
                                response == null ||
                                response.touchedSection == null) {
                              _touchedIndex = -1;
                              return;
                            }
                            _touchedIndex = response.touchedSection!.touchedSectionIndex;
                          });
                        },
                      ),
                      sectionsSpace: 2,
                      centerSpaceRadius: 35,
                      sections: _buildSections(total),
                    ),
                  ),
                ),
                const SizedBox(width: 20),
                
                // 图例
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: _categories.map((c) {
                      final index = _categories.indexOf(c);
                      final isTouched = index == _touchedIndex;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            Container(
                              width: 12,
                              height: 12,
                              decoration: BoxDecoration(
                                color: c.color,
                                borderRadius: BorderRadius.circular(3),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                c.name,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: isTouched ? FontWeight.bold : FontWeight.normal,
                                ),
                              ),
                            ),
                            Text(
                              FormatUtils.formatAmount(c.amount),
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: isTouched ? FontWeight.bold : FontWeight.w500,
                                color: isTouched ? c.color : null,
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  List<PieChartSectionData> _buildSections(double total) {
    return _categories.asMap().entries.map((entry) {
      final index = entry.key;
      final data = entry.value;
      final isTouched = index == _touchedIndex;
      final percentage = data.amount / total * 100;

      return PieChartSectionData(
        color: data.color,
        value: data.amount,
        title: isTouched ? '${percentage.toStringAsFixed(1)}%' : '',
        radius: isTouched ? 40 : 35,
        titleStyle: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      );
    }).toList();
  }
}

class CategoryData {
  final String name;
  final double amount;
  final Color color;

  CategoryData(this.name, this.amount, this.color);
}
