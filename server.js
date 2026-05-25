const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = 3000;

// 你的DeepSeek API Key，填在这里
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

app.use(cors());
app.use(express.json());

app.post('/api/generate', async (req, res) => {
    const data = req.body;

    const prompt = buildPrompt(data);

    const payload = JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
            {
                role: 'system',
                content: '你是一位专业的运动营养师和健身教练，拥有丰富的减脂指导经验。请根据用户的身体数据，生成科学、详细、个性化的减脂报告。语气专业但友好，数据要有依据，预期要realistic不夸大。'
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        max_tokens: 6000,
        temperature: 0.7
    });

    const options = {
        hostname: 'api.deepseek.com',
        path: '/chat/completions',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    const apiReq = https.request(options, (apiRes) => {
        let body = '';
        apiRes.on('data', chunk => body += chunk);
        apiRes.on('end', () => {
            try {
		console.log('DeepSeek原始返回:', body);
                const result = JSON.parse(body);
                const content = result.choices[0].message.content;
                res.json({ success: true, report: content });
            } catch (e) {
                res.status(500).json({ success: false, error: '解析响应失败' });
            }
        });
    });

    apiReq.on('error', (e) => {
        res.status(500).json({ success: false, error: e.message });
    });

    apiReq.write(payload);
    apiReq.end();
});

function buildPrompt(data) {
    const basicInfo = `
用户基本信息：
- 性别：${data.gender}
- 年龄：${data.age}岁
- 身高：${data.height}cm
- 体重：${data.weight}kg
- 日常活动量：${data.activityLevel}
- 减脂目标：${data.goal}
- 运动场景：${data.scene}
    `;

    const extraInfo = data.bodyFat ? `
精准身体数据：
- 体脂率：${data.bodyFat || '未提供'}%
- 肌肉量：${data.muscleMass || '未提供'}kg
- 内脏脂肪等级：${data.visceralFat || '未提供'}
- 基础代谢率：${data.bmr || '未提供'}kcal
    ` : '（用户未提供精准身体数据，请根据基础信息估算）';

    return `${basicInfo}${extraInfo}

请生成一份完整的减脂报告，严格按以下三部分输出：

## 第一部分：身体状况分析
- 计算BMI并评估
- 估算或确认体脂率，评估身体成分状态
- 设定目标体重范围
- 预计减脂周期
- 阶段性预期（第2周、第4周、第8周、第12周各会有什么感受和变化，要realistic）
- 特别说明：减脂是缓慢过程，帮用户建立正确预期

## 第二部分：饮食建议
- 计算每日推荐摄入热量和热量缺口
- 三大营养素比例建议
- 推荐食物类别（不要规定死，给类别和选择范围）
- 推荐烹饪方式
- 各类食物大致食用量参考
- 应避免或减少的食物类别

## 第三部分：运动计划（${data.scene}）
- 有氧训练推荐（类别、时长、频次、强度）
- 力量训练推荐（类别、组数、频次）
- 每周预计总热量消耗
- 注意事项`;
}

app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
