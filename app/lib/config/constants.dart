// 全局配置文件 —— 自动连接你电脑的后端
class Constants {
  // ====================== 后端 API 地址 ======================
  static const String baseUrl = "http://192.168.1.18:3000/api";

  // ====================== 接口路径 ======================
  static const String login = "$baseUrl/user/login";
  static const String register = "$baseUrl/user/register";
  static const String addBill = "$baseUrl/bill/add";
  static const String getBillList = "$baseUrl/bill/list";
}