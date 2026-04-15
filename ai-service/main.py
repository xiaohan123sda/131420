# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

"""
随手记 AI 分类服务
自动对账单进行智能分类
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import re
from datetime import datetime

app = FastAPI(title="随手记 AI 服务", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== 分类体系 ====================
CATEGORY_RULES = {
    "餐饮": {
        "keywords": [
            "餐厅", "饭店", "酒楼", "酒店", "食堂", "快餐", "小吃", "外卖", "美团", "饿了么",
            "星巴克", "瑞幸", "奶茶", "咖啡", "饮品", "水果", "零食", "超市", "便利店",
            "麦当劳", "肯德基", "汉堡", "披萨", "火锅", "烧烤", "川菜", "粤菜", "湘菜",
            "早餐", "午餐", "晚餐", "夜宵", "自助餐", "家常菜"
        ],
        "subcategories": {
            "外卖": ["美团外卖", "饿了么", "外卖", "配送"],
            "堂食": ["餐厅", "饭店", "酒楼", "食堂", "快餐", "小吃"],
            "饮品": ["星巴克", "瑞幸", "奶茶", "咖啡", "饮品"],
            "零食": ["零食", "水果", "便利店", "超市"],
        }
    },
    "购物": {
        "keywords": [
            "淘宝", "天猫", "京东", "拼多多", "唯品会", "苏宁", "国美", "亚马逊",
            "购物", "商城", "超市", "百货", "服装", "鞋", "包", "化妆品", "护肤品",
            "电子产品", "手机", "电脑", "数码", "家电", "家具", "家居", "母婴", "童装",
            "男装", "女装", "运动", "户外", "图书", "文具", "办公"
        ],
        "subcategories": {
            "服装": ["服装", "鞋", "包", "童装", "男装", "女装", "运动"],
            "电子产品": ["手机", "电脑", "数码", "电子产品", "家电"],
            "日用品": ["家居", "日用品", "百货", "超市"],
            "化妆品": ["化妆品", "护肤品", "美容"],
        }
    },
    "交通": {
        "keywords": [
            "打车", "滴滴", "出租车", "地铁", "公交", "高铁", "火车", "飞机", "轮船",
            "停车", "加油", "充电", "保养", "维修", "过路费", "高速", "违章", "罚款",
            "共享单车", "电动车", "自行车", "摩拜", "哈啰", "青桔"
        ],
        "subcategories": {
            "打车": ["打车", "滴滴", "出租车"],
            "公交地铁": ["地铁", "公交"],
            "私家车": ["停车", "加油", "充电", "保养", "维修", "过路费"],
        }
    },
    "人情往来": {
        "keywords": [
            "红包", "转账", "请客", "送礼", "礼物", "生日", "节日", "婚礼", "满月酒",
            "人情", "慰问", "捐款", "公益", "慈善", "众筹", "AA"
        ],
        "subcategories": {
            "请客吃饭": ["请客", "AA"],
            "红包礼物": ["红包", "礼物", "送礼", "生日", "节日"],
            "转账": ["转账"],
        }
    },
    "居家缴费": {
        "keywords": [
            "房租", "水电", "燃气", "物业", "宽带", "话费", "有线电视", "快递",
            "维修", "保洁", "家教", "培训", "学费", "书本", "保险", "医疗",
            "买菜", "做饭", "食材", "日用"
        ],
        "subcategories": {
            "水电煤": ["水电", "燃气"],
            "房租": ["房租"],
            "话费": ["话费"],
            "网购": ["快递", "菜鸟", "京东物流"],
        }
    },
    "其他": {
        "keywords": [
            "娱乐", "电影", "KTV", "酒吧", "旅游", "门票", "健身", "美容", "美发",
            "医疗", "药店", "医院", "诊所", "教育", "培训", "考试", "会员", "订阅",
            "游戏", "充值", "Q币", "话费等"
        ],
        "subcategories": {
            "医疗": ["医疗", "医院", "药店", "诊所"],
            "教育": ["教育", "培训", "学费", "书本", "考试"],
            "娱乐": ["电影", "KTV", "酒吧", "健身", "娱乐"],
        }
    }
}

# ==================== Pydantic 模型 ====================
class ClassifyRequest(BaseModel):
    merchant_name: str
    amount: Optional[float] = None
    platform: Optional[str] = None
    user_preferences: Optional[dict] = None

class ClassifyResponse(BaseModel):
    category_big: str
    category_small: str
    confidence: float
    reasoning: str

class BatchClassifyRequest(BaseModel):
    transactions: List[dict]

class BatchClassifyResponse(BaseModel):
    results: List[ClassifyResponse]

class AnalyzeRequest(BaseModel):
    transactions: List[dict]
    total_expense: float
    month: str

class AnalyzeResponse(BaseModel):
    total_expense: float
    category_breakdown: dict
    unnecessary_expense: float
    suggestions: List[str]
    trend: dict

# ==================== 工具函数 ====================
def normalize_text(text: str) -> str:
    """标准化文本"""
    if not text:
        return ""
    # 移除特殊字符，保留中文、英文、数字
    text = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9]', '', text)
    return text.lower()

def calculate_confidence(keyword_matches: int, total_keywords: int) -> float:
    """计算置信度"""
    if total_keywords == 0:
        return 0.5
    # 基础置信度
    base = min(keyword_matches / max(total_keywords, 1), 1.0)
    # 提升匹配数量带来的置信度
    if keyword_matches >= 3:
        return min(base + 0.2, 0.99)
    elif keyword_matches >= 2:
        return min(base + 0.15, 0.95)
    return base

def classify_merchant(merchant_name: str) -> tuple[str, str, float]:
    """
    对商户名进行分类
    返回: (大分类, 小分类, 置信度)
    """
    if not merchant_name:
        return "其他", "其他", 0.5
    
    normalized = normalize_text(merchant_name)
    best_match = None
    best_score = 0
    best_subcategory = "其他"
    
    for category, config in CATEGORY_RULES.items():
        score = 0
        matched_sub = None
        
        # 检查主分类关键词
        for keyword in config.get("keywords", []):
            if normalize_text(keyword) in normalized or normalize_text(merchant_name) in normalize_text(keyword):
                score += 1
                # 检查子分类
                for subcat, subkeywords in config.get("subcategories", {}).items():
                    for subkeyword in subkeywords:
                        if normalize_text(subkeyword) in normalized:
                            matched_sub = subcat
                            score += 0.5
                            break
        
        if score > best_score:
            best_score = score
            best_match = category
            best_subcategory = matched_sub or "其他"
    
    if best_match:
        confidence = calculate_confidence(int(best_score), len(CATEGORY_RULES[best_match].get("keywords", [])))
        return best_match, best_subcategory, confidence
    
    return "其他", "其他", 0.5

def classify_by_amount(amount: float, platform: str = None) -> str:
    """
    根据金额和平台辅助判断分类
    """
    # 大额支出通常是购物或特殊消费
    if amount > 1000:
        # 房租判断
        if amount > 2000 and amount < 5000:
            return "居家缴费"
        return "购物"
    
    # 小额高频可能是餐饮
    if amount < 50 and platform in ["wechat", "alipay"]:
        return "餐饮"
    
    return "其他"

# ==================== API 路由 ====================
@app.get("/")
async def root():
    return {"message": "随手记 AI 服务运行中", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/classify", response_model=ClassifyResponse)
async def classify(request: ClassifyRequest):
    """单条账单分类"""
    try:
        category, subcategory, confidence = classify_merchant(request.merchant_name)
        
        # 如果置信度低，尝试用金额辅助判断
        if confidence < 0.5 and request.amount:
            amount_category = classify_by_amount(request.amount, request.platform)
            if amount_category != "其他":
                category = amount_category
                subcategory = "其他"
                confidence = 0.6
        
        return ClassifyResponse(
            category_big=category,
            category_small=subcategory,
            confidence=round(confidence, 4),
            reasoning=f"根据商户名「{request.merchant_name}」匹配到分类「{category}-{subcategory}」"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/classify/batch", response_model=BatchClassifyResponse)
async def batch_classify(request: BatchClassifyRequest):
    """批量账单分类"""
    results = []
    for trans in request.transactions:
        try:
            merchant_name = trans.get("merchant_name", "")
            category, subcategory, confidence = classify_merchant(merchant_name)
            
            if confidence < 0.5 and trans.get("amount"):
                amount_category = classify_by_amount(trans["amount"], trans.get("platform"))
                if amount_category != "其他":
                    category = amount_category
                    confidence = 0.6
            
            results.append(ClassifyResponse(
                category_big=category,
                category_small=subcategory,
                confidence=round(confidence, 4),
                reasoning=f"商户「{merchant_name}」-> {category}-{subcategory}"
            ))
        except Exception as e:
            results.append(ClassifyResponse(
                category_big="其他",
                category_small="其他",
                confidence=0.5,
                reasoning=f"分类失败: {str(e)}"
            ))
    
    return BatchClassifyResponse(results=results)

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    """消费分析"""
    try:
        # 按分类汇总
        category_breakdown = {}
        unnecessary_keywords = ["外卖", "奶茶", "咖啡", "零食", "冲动购物", "会员"]
        
        for trans in request.transactions:
            category = trans.get("category_big", "其他")
            amount = float(trans.get("amount", 0))
            category_breakdown[category] = category_breakdown.get(category, 0) + amount
        
        # 计算非必要消费
        unnecessary_expense = 0
        for trans in request.transactions:
            category = trans.get("category_big", "")
            amount = float(trans.get("amount", 0))
            if category == "餐饮" or category == "购物":
                unnecessary_expense += amount * 0.3  # 假设30%为非必要
        
        # 生成建议
        suggestions = []
        total = sum(category_breakdown.values()) or 1
        
        if category_breakdown.get("餐饮", 0) / total > 0.4:
            suggestions.append("餐饮支出占比偏高，建议减少外卖次数，自己做饭更健康省钱")
        
        if category_breakdown.get("购物", 0) / total > 0.3:
            suggestions.append("购物支出较大，建议先加入购物车冷静一下，避免冲动消费")
        
        if unnecessary_expense > 1000:
            suggestions.append(f"本月非必要消费约¥{int(unnecessary_expense)}，下月可以尝试控制")
        
        if not suggestions:
            suggestions.append("本月消费结构良好，继续保持！")
        
        return AnalyzeResponse(
            total_expense=request.total_expense,
            category_breakdown=category_breakdown,
            unnecessary_expense=round(unnecessary_expense, 2),
            suggestions=suggestions,
            trend={}  # TODO: 接入历史数据计算趋势
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/categories")
async def get_categories():
    """获取分类体系"""
    return {
        "categories": list(CATEGORY_RULES.keys()),
        "subcategories": {k: list(v.get("subcategories", {}).keys()) for k, v in CATEGORY_RULES.items()}
    }

# ==================== 启动 ====================
if __name__ == "__main__":
    print("""
====================================================

   AI 随手记 AI 服务启动成功

   端口: 8000
   文档: http://localhost:8000/docs

====================================================
    """)
    uvicorn.run(app, host="0.0.0.0", port=8000)
