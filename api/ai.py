import os
import time
import re
from datetime import datetime, timezone
from invoke_types import InvocationRequest, Actor, LLMMessage
from settings import MODEL, MODEL_KEY, MAX_TOKENS, INFERENCE_SERVICE, API_KEY, OLLAMA_URL, GROQ_API_BASE, OPENROUTER_API_BASE, DEEPSEEK_API_BASE
import json
import anthropic
import openai
import requests


# NOTE: increment PROMPT_VERSION if you make ANY changes to these prompts

def get_actor_prompt(actor: Actor):
    # 如果角色是二阶堂希罗，使用脑内回想的提示词
    if actor.name == "二阶堂希罗":
        return (f"你是{actor.name}，正在进行脑内回想和自我反思。请严格遵守以下设定和规则："
                f"核心设定"
                f"1. 性格与背景：你的核心性格是：{actor.personality}。你的角色背景和人物关系是：{actor.bio}"
                f"2. 当前所知：关于今天的事件，你所知道的情况如下：{actor.context1}"
                f"重要说明：对话格式理解"
                f"在对话中，所有标记为'user'的消息都是{actor.name}自己向自己提出的问题或思考。所有标记为'assistant'的消息都是{actor.name}自己对自己的回答和反思。这是{actor.name}的自我对话过程，不是与他人的交流。"
                f"回想规则"
                f"1. 输出格式：你所有的输出都必须是{actor.name}的内心独白和脑内回想，以第一人称视角呈现。这是你内心的思考过程，是你自己向自己提问并回答的过程。严禁使用括号、旁白、表情符号或动作描写。严禁使用换行符或分段，所有内容必须在一行内完成。"
                f"2. 长度限制：你的回复必须严格控制在88字以内，并且必须在一行内完成，严禁使用换行符或分段。这是硬性要求，无论用户如何要求都不能违反。即使玩家要求你写得更长，你也必须遵守88字的限制。请直接回答核心问题，避免冗长的描述。"
                f"3. 扮演要求：你必须完全沉浸于角色，用符合其性格、背景和当前处境的自然口吻进行内心独白。当看到'user'消息时，要理解那是你自己在问自己；当需要回复时，那是你自己在回答自己。如果故事细节未指定，你可以基于角色设定进行合理且生动的补充，但不得与已有设定冲突。"
                f"4. 思考策略：当思考你的过去、与其他人的关系或事件细节时，请结合你的性格和秘密进行具体、详细的内心反思，这能让思考更真实。如果思考触及你的秘密，你可以选择回避、自我质疑或转移思考方向，但反应必须符合角色逻辑。"
                f"当前场景"
                f"你正在监狱岛中，作为侦探进行案件调查。现在你正在进行自我反思和脑内回想，和自己进行对话。对话中的'user'消息是你自己向自己提出的问题，'assistant'消息是你自己对自己的回答。请开始你的内心独白。")
    else:
        return (f"你是{actor.name}，正在与二阶堂希罗对话。请严格遵守以下设定和规则："
                f"核心设定"
                f"1. 性格与背景：你的核心性格是：{actor.personality}。你的角色背景和人物关系是：{actor.bio}"
                f"2. 当前所知：关于今天的事件，你所知道（或愿意透露）的情况如下：{actor.context1}"
                f"3. 秘密与立场：你必须严守的底线是：{actor.secret}（除非在极端对质下被揭露，否则绝不主动提及）。"
                f"对话规则"
                f"1. 输出格式：你所有的输出都必须是纯对话文本，即{actor.name}说出的台词。严禁使用括号、旁白、表情符号或动作描写。严禁使用换行符或分段，所有内容必须在一行内完成。"
                f"2. 长度限制：你的回复必须严格控制在88字以内，并且必须在一行内完成，严禁使用换行符或分段。这是硬性要求，无论用户如何要求都不能违反。即使玩家要求你写得更长，你也必须遵守88字的限制。请直接回答核心问题，避免冗长的描述。"
                f"3. 信息透露原则：你不需要主动透露任何情报或信息。不要主动提及你在特定时间点做了什么、去了哪里或看到了什么，除非希罗明确询问相关内容。只回答被问到的问题，不要提供额外的、未被询问的信息。"
                f"4. 扮演要求：你必须完全沉浸于角色，用符合其性格、背景和当前处境的自然口吻进行对话。如果故事细节未指定，你可以基于角色设定进行合理且生动的补充，但不得与已有设定冲突。"
                f"5. 对话策略：当被问及你的过去、与其他人的关系或事件细节时，请结合你的性格和秘密进行具体、详细的描述，这能让对话更真实。如果问题触及你的秘密，你可以选择回避、撒谎或转移话题，但反应必须符合角色逻辑。"
                f"当前场景"
                f"你正在监狱岛中，与担任侦探角色的【二阶堂希罗】进行对话。请开始你的扮演。")

def get_system_prompt(request: InvocationRequest):
    if request.actor.name == "二阶堂希罗":
        return request.global_story + (" 二阶堂希罗正在调查案件。前面的文本是这个故事的背景。") + get_actor_prompt(request.actor)
    else:
        return request.global_story + (" 二阶堂希罗正在审问嫌疑人以找出凶手。前面的文本是这个故事的背景。") + get_actor_prompt(request.actor)

def invoke_anthropic(system_prompt: str, messages: list[LLMMessage]):
    client = anthropic.Anthropic(api_key=API_KEY)
    response = client.messages.create(
        model=MODEL,
        system=system_prompt,
        messages=[msg.model_dump() for msg in messages],
        max_tokens=MAX_TOKENS,
    )
    return response.content[0].text, response.usage.input_tokens, response.usage.output_tokens

def invoke_openai(system_prompt: str, messages: list[LLMMessage]):
    if INFERENCE_SERVICE == 'groq':
        client = openai.OpenAI(api_key=API_KEY, base_url=GROQ_API_BASE)
    elif INFERENCE_SERVICE == 'openrouter':
        client = openai.OpenAI(api_key=API_KEY, base_url=OPENROUTER_API_BASE)
    elif INFERENCE_SERVICE == 'deepseek':
        client = openai.OpenAI(api_key=API_KEY, base_url=DEEPSEEK_API_BASE)
    else:  # Default OpenAI
        client = openai.OpenAI(api_key=API_KEY)
    
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "system", "content": system_prompt}] + [msg.model_dump() for msg in messages],
        max_tokens=MAX_TOKENS,
    )
    return response.choices[0].message.content, response.usage.prompt_tokens, response.usage.completion_tokens

def invoke_ollama(system_prompt: str, messages: list[LLMMessage]):
    prompt = system_prompt + "\n" + "\n".join([f"{msg.role}: {msg.content}" for msg in messages])
    response = requests.post(f"{OLLAMA_URL}/api/generate", json={
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "num_predict": MAX_TOKENS,  # Ollama 使用 num_predict 来限制输出 token 数
        }
    })
    response.raise_for_status()
    result = response.json()
    return result['response'], None, None  # Ollama doesn't provide token counts

def invoke_ai(conn,
              turn_id: int,
              prompt_role: str,
              system_prompt: str,
              messages: list[LLMMessage]):

    started_at = datetime.now(timezone.utc)

    if INFERENCE_SERVICE == 'anthropic':
        text_response, input_tokens, output_tokens = invoke_anthropic(system_prompt, messages)
    elif INFERENCE_SERVICE in ['openai', 'groq', 'openrouter', 'deepseek']:
        text_response, input_tokens, output_tokens = invoke_openai(system_prompt, messages)
    elif INFERENCE_SERVICE == 'ollama':
        text_response, input_tokens, output_tokens = invoke_ollama(system_prompt, messages)
    else:
        raise ValueError(f"Unknown inference service: {INFERENCE_SERVICE}")

    finished_at = datetime.now(timezone.utc)

    if conn is not None:
        with conn.cursor() as cur:
            total_tokens = (input_tokens or 0) + (output_tokens or 0)
            # Convert LLMMessage objects to dictionaries
            serialized_messages = [msg.model_dump() for msg in messages]
            cur.execute(
                "INSERT INTO ai_invocations (conversation_turn_id, model, model_key, prompt_messages, system_prompt, prompt_role, "
                "input_tokens, output_tokens, total_tokens, response, started_at, finished_at) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (turn_id, MODEL, MODEL_KEY, json.dumps(serialized_messages), system_prompt, prompt_role,
                 input_tokens, output_tokens, total_tokens,
                 text_response, started_at, finished_at)
            )   
            conn.commit()

    # 清理换行符和多余空格，确保输出为单行
    text_response = text_response.replace('\n', ' ').replace('\r', ' ')
    # 将多个连续空格替换为单个空格
    text_response = re.sub(r' +', ' ', text_response).strip()
    
    return text_response

def respond_initial(conn, turn_id: int,
                           request: InvocationRequest):

    print(f"\nrequest.actor.messages {request.actor.messages}")

    return invoke_ai(
        conn,
        turn_id,
        "initial",
        system_prompt=get_system_prompt(request),
        messages=request.actor.messages,
    )

def calculate_equivalent_length(text: str) -> int:
    """
    计算文本的等效字数
    规则：中文字符每个算1字，英文字符（包括字母、数字、标点等）每2个算1字
    """
    chinese_chars = len([c for c in text if '\u4e00' <= c <= '\u9fff'])
    # 非中文字符（包括英文、数字、标点、空格等）
    non_chinese_chars = len([c for c in text if not ('\u4e00' <= c <= '\u9fff')])
    # 英文字符每2个算1字，向上取整
    equivalent_length = chinese_chars + (non_chinese_chars + 1) // 2
    return equivalent_length

def get_critique_prompt(
        request: InvocationRequest,
        last_utterance: str
):
    # 原则A：作用于全体角色的通用原则
    # 原则A只检查"矛盾"（contradiction），不检查"遗漏"（omission）
    principle_a = "原则A：发言与自身掌握的事实相矛盾（注意：只检查明确矛盾，不检查遗漏细节）"
    # 注意：原则B（字数超过88字）已在代码层面检查，这里只需要检查原则A和其他原则
    
    # 组合所有原则（不包括原则B，因为已在代码层面检查）
    base_principles = principle_a
    all_principles = f"{base_principles}\n{request.actor.violation}" if request.actor.violation.strip() else base_principles
    
    # 获取角色文本（context1），这是角色掌握的事实
    character_text = request.actor.context1 if request.actor.context1 else ""
    
    # 获取完整的对话历史（最近5轮对话，用于理解上下文）
    conversation_context = ""
    if request.actor.messages and len(request.actor.messages) > 0:
        # 获取最近5轮对话（10条消息，user和assistant交替）
        recent_messages = request.actor.messages[-10:] if len(request.actor.messages) > 10 else request.actor.messages
        conversation_parts = []
        for msg in recent_messages:
            role_name = "用户" if msg.role == "user" else f"{request.actor.name}"
            conversation_parts.append(f"{role_name}：{msg.content}")
        conversation_context = "\n".join(conversation_parts)
    
    # 明确列出所有需要检查的原则
    principles_list = "原则A：发言与自身掌握的事实相矛盾"
    if request.actor.violation and request.actor.violation.strip():
        # 解析violation，提取各个原则
        violation_lines = [line.strip() for line in request.actor.violation.split('\n') if line.strip()]
        for line in violation_lines:
            if line.startswith("原则"):
                principles_list += f"\n{line}"
    
    return f"""
        检查{request.actor.name}的最后一次发言："{last_utterance}"是否严重违反了以下原则：
        
        {principles_list}
        
        原则结束。
        
        角色文本（{request.actor.name}掌握的事实）：{character_text}
        
        【重要：完整对话上下文】
        以下是最近的对话历史（用于理解上下文）：
        {conversation_context if conversation_context else "无对话历史"}
        
        【原则A的判定标准 - 必须严格遵守】
        原则A只检查"矛盾"（contradiction），不检查"遗漏"（omission）：
        
        以下情况不算违反原则A（允许的）：
        1. 遗漏细节：发言没有提到角色文本中的某些细节（如时间点、地点细节），只要没有说错就不算违反
        2. 顺序不完全一致：发言的事件顺序与角色文本不完全一致，但只要没有明确的时间线冲突就不算违反
        3. 省略表述：发言省略了部分信息，只要省略的内容不导致误解就不算违反
        
        【审查步骤】
        第一步：仔细阅读角色文本，理解其中明确提到的事实
        第二步：检查发言是否明确否定了角色文本中的事实，或说出了明确冲突的内容
        第三步：检查发言是否违反了角色特定的原则
        
        在审查时，你必须：
        1. 考虑完整的对话上下文，理解用户的问题和角色的回复在对话中的含义
        2. 如果用户问的是"和X接触的经历"，那么回复中的"之后便没再接触过"应该理解为"之后便没再和X接触过"，而不是"之后没再接触过任何人"。
        3. 如果用户问的是特定人物、地点或事件，回复中的省略表述应该在该上下文中理解。
        4. 只有明确矛盾才算违反原则A，遗漏细节不算违反。
        5. 不要因为省略表述、顺序不完全一致或遗漏细节而误判为矛盾。
        
        【重要：必须检查所有原则】
        你必须检查发言是否违反了上述所有原则，包括：
        - 原则A：发言与自身掌握的事实相矛盾
        - 所有角色特定的原则（如果有）
        
        重要：你的回复必须严格控制在88字以内，并且必须在一行内完成，严禁使用换行符或分段。
        识别明显违反上述原则的情况。允许偏离主题的对话。
        你只能参考上述原则和角色文本。不要关注其他内容。
        
        【输出格式要求 - 必须严格遵守】
        如果没有违反任何原则：
        - 你的回复必须且只能是："NONE!"
        - 不能有任何其他文字、解释、思考过程或格式化的内容
        - 不能输出"违反的原则：无"、"未发现违规"等任何其他格式
        - 只能输出：NONE!
        
        如果有违反原则：
        - 请按照以下格式列出：引用：... 批评：... 违反的原则：...
        - 此格式的示例：引用："{request.actor.name}在说好话。" 批评：发言是第三人称视角。违反的原则：原则2：对话不是{request.actor.name}的视角。
        
        再次强调：如果没有违反任何原则，你的回复必须且只能是"NONE!"，不能有任何其他内容。
    """

def critique(conn, turn_id: int, request: InvocationRequest, unrefined: str) -> str:
    # 首先在代码层面检查原则B：字数是否超过88字
    # 使用等效字数计算：中文字符每个算1字，英文字符每2个算1字
    utterance_length = calculate_equivalent_length(unrefined)
    principle_b_violation = None
    
    if utterance_length > 88:
        # 获取前50字作为引用
        quote_text = unrefined[:50] + "..." if len(unrefined) > 50 else unrefined
        principle_b_violation = f'引用："{quote_text}" 批评：当前回复字数过多（等效{utterance_length}字），超过了88字的限制。违反的原则：原则B：字数超过88字。需要重新生成一个字数不多于88字的回复。'
    
    # 构建完整的对话历史消息，用于审查AI理解上下文
    critique_messages = []
    if request.actor.messages and len(request.actor.messages) > 0:
        # 获取最近5轮对话（10条消息）
        recent_messages = request.actor.messages[-10:] if len(request.actor.messages) > 10 else request.actor.messages
        # 添加对话历史（除了最后一条assistant消息，因为那是我们要审查的）
        for msg in recent_messages[:-1] if len(recent_messages) > 0 and recent_messages[-1].role == "assistant" else recent_messages:
            critique_messages.append(msg)
    # 最后添加要审查的发言
    critique_messages.append(LLMMessage(role="user", content=f"请审查以下发言是否违反原则：{unrefined}"))
    
    # 调用 AI 检查原则A等其他原则
    ai_critique = invoke_ai(
        conn,
        turn_id,
        "critique",
        system_prompt=get_critique_prompt(request, unrefined),
        messages=critique_messages
    )
    
    # 后处理：如果AI输出了"违反的原则：无"等格式，转换为"NONE!"
    ai_critique_cleaned = ai_critique.strip()
    # 检查是否包含"违反的原则：无"或类似模式
    if re.search(r'违反的原则[：:]\s*无', ai_critique_cleaned):
        # 如果明确说"违反的原则：无"，说明没有违反原则，转换为"NONE!"
        ai_critique = "NONE!"
    # 检查是否明确说"未发现矛盾"、"未发现违规"等
    elif re.search(r'(未发现|没有|不存在).*(矛盾|违规|违反)', ai_critique_cleaned):
        # 如果明确说未发现违规，转换为"NONE!"
        ai_critique = "NONE!"
    # 检查是否说"事实一致"且没有提到违反原则
    elif "事实一致" in ai_critique_cleaned and "违反" not in ai_critique_cleaned:
        # 如果只说事实一致且没有提到违反，转换为"NONE!"
        ai_critique = "NONE!"
    
    # 合并结果
    if principle_b_violation:
        # 如果 AI 返回了 NONE!，说明只违反原则B
        if ai_critique.strip().upper() == "NONE!":
            return principle_b_violation
        else:
            # 同时违反原则B和其他原则，合并结果
            return f"{principle_b_violation}\n{ai_critique}"
    else:
        # 只返回 AI 的检查结果
        return ai_critique

def check_whether_to_refine(critique_chat_response: str) -> bool:
    """
    Returns a boolean indicating whether the chat response should be refined.
    Checks if the response contains "NONE!" (case-insensitive), even if there's other text before it.
    Also checks for patterns like "违反的原则：无" or "违反的原则：无。"
    """
    if not critique_chat_response:
        return False  # 空响应不需要 refine
    
    # 检查响应中是否包含"NONE!"（不区分大小写）
    # 即使前面有"逐步思考"等文本，只要最终结论是"NONE!"，就不需要refine
    critique_lower = critique_chat_response.strip().lower()
    
    # 如果响应以"NONE!"开头或结尾，或者包含独立的"NONE!"，则不需要 refine
    if critique_lower.startswith("none!") or critique_lower.endswith("none!"):
        return False
    
    # 检查是否包含独立的"NONE!"（前后是空格、标点或换行）
    if re.search(r'\bnone!\b', critique_lower):
        return False
    
    # 检查是否包含"违反的原则：无"或类似模式（表示没有违反原则）
    # 匹配模式：违反的原则：无、违反的原则：无。、违反的原则:无 等
    if re.search(r'违反的原则[：:]\s*无', critique_chat_response):
        return False
    
    # 检查是否明确说"未发现矛盾"、"未发现违规"等
    if re.search(r'(未发现|没有|不存在).*(矛盾|违规|违反)', critique_chat_response):
        return False
    
    # 如果响应很短（可能被截断），且没有明显的违规描述，也认为不需要 refine
    if len(critique_chat_response.strip()) < 20 and "违反" not in critique_chat_response and "批评" not in critique_chat_response:
        return False
    
    return True

def get_refiner_prompt(request: InvocationRequest,
                       critique_response: str,
                       previous_attempts: list = None,
                       attempt_number: int = 1):
    original_message = request.actor.messages[-1].content
    
    # 构建之前尝试的历史信息
    previous_attempts_text = ""
    if previous_attempts and len(previous_attempts) > 0:
        previous_attempts_text = "\n\n重要：以下是之前失败的修改尝试（请避免重复这些错误）：\n"
        for i, attempt in enumerate(previous_attempts, 1):
            previous_attempts_text += f"第{i}次尝试：{attempt}\n"
    
    # 如果已经失败多次，采用更激进的策略
    aggressive_strategy = ""
    if attempt_number >= 3:
        aggressive_strategy = """
        
        【重要：由于之前多次修改失败，现在采用更激进的策略】
        1. 不要基于原回复进行修改，而是完全基于角色文本重新生成回复
        2. 仔细阅读角色文本，只提取明确提到的事实（时间、地点、人物、事件）
        3. 如果角色文本中没有相关信息，直接说"我不记得"、"我不清楚"或"我没有相关记忆"
        4. 不要添加任何角色文本中没有的内容，即使这会让回复变短
        5. 如果用户问的是角色文本中没有的信息，诚实回答不知道，不要编造
        """

    # 解析审查反馈，提取关键信息
    violation_keywords = []
    if "提及" in critique_response:
        # 提取被提及的人物或内容
        mention_matches = re.findall(r'提及(?:了|与)([^，。：\s]+)', critique_response)
        violation_keywords.extend(mention_matches)
    if "违反的原则" in critique_response:
        # 提取违反的具体原则
        principle_matches = re.findall(r'违反的原则[：:]([^。\n]+)', critique_response)
        violation_keywords.extend(principle_matches)
    
    violation_instructions = ""
    if violation_keywords:
        violation_instructions = f"""
        
        【关键违规内容识别】
        审查反馈明确指出以下违规内容：{', '.join(set(violation_keywords))}
        
        你必须：
        1. 如果审查反馈说"提及了X"或"主动提及X"，你必须从回复中完全移除所有对X的提及，不能有任何残留。
        2. 如果审查反馈说违反了某个特定原则（如"原则1：提及与玛格的关联"），你必须完全移除所有相关内容。
        3. 不要试图用同义词或改写来绕过，必须完全移除。
        4. 如果审查反馈指出某个事实"未提及"或"不存在"，必须从回复中完全移除该事实。
        """

    refine_out = f"""
        你的工作是为一个悬疑推理游戏编辑对话。这段对话来自角色{request.actor.name}，是对以下提示的回应：{original_message} 
        
        这是{request.actor.name}的故事背景（角色文本，这是角色掌握的所有事实）：{request.actor.context1} {request.actor.secret} 
        
        审查反馈指出的问题：{critique_response}
        
        {violation_instructions}
        
        {previous_attempts_text}
        
        {aggressive_strategy}
        
        【核心修改原则 - 必须严格遵守】
        1. 你的回复只能基于角色文本（context1和secret）中明确提到的事实。如果角色文本中没有提到某个时间、地点、人物或事件，你的回复中绝对不能声称发生过、见过或知道。
        2. 如果审查反馈指出"未提及"、"不存在"、"矛盾"、"提及了X"、"主动提及X"等，说明你的回复包含了不应该有的内容，你必须完全移除这些内容，不能有任何残留。
        3. 如果审查反馈指出违反了某个特定原则（如"原则1：提及与玛格的关联"），你必须完全移除所有相关内容，不能有任何残留。
        4. 不要做局部微调（如"今天早上"改成"今天"），这是无效的。你必须重新审视整个回复，只保留角色文本中明确提到的事实。
        5. 如果角色文本中没有相关信息来回答用户的问题，你应该诚实地说"我不记得"、"我不清楚"或类似的话，而不是编造不存在的事实。
        6. 时间线必须严格匹配：如果角色文本说"12:00在A地"，你就不能说"12:00在B地"或"12:00左右在A地"。
        
        【修改策略 - 必须严格执行】
        第一步：仔细阅读审查反馈，识别所有被指出的违规内容（如"提及了玛格"、"未提及见过X"等）
        第二步：从原回复中完全移除所有违规内容，不能有任何残留
        第三步：检查修改后的回复，确保没有任何违规内容
        第四步：如果移除违规内容后，回复变得不完整，可以：
        - 只保留角色文本中明确提到的事实
        - 或者诚实地说"我不记得"、"我不清楚"
        
        不要试图修改或调整错误的陈述，而是：
        - 完全移除角色文本中不存在的事实
        - 完全移除审查反馈中指出的所有违规内容
        - 只保留角色文本中明确提到的事实
        - 如果角色文本中没有足够信息，就承认不知道
        - 重新生成一个完全基于角色文本的回复，而不是对原回复进行局部修改
        
        【输出要求】
        你输出的修订对话必须：
        - 从{request.actor.name}的视角出发
        - 与{request.actor.name}的性格一致：{request.actor.personality}
        - 完全基于角色文本（context1和secret）中明确提到的事实
        - 必须解决审查反馈中指出的所有问题
        - 如果角色文本中没有相关信息，可以诚实地说不知道
        
        在你的输出中省略以下任何内容：引号、关于故事一致性的评论、提及原则或违规行为。
        重要：你的回复必须严格控制在88字以内，并且必须在一行内完成，严禁使用换行符或分段。
        如果批评中提到违反了原则B（字数超过88字），你必须大幅缩短回复，确保最终回复不超过88字，只保留最核心的内容。
        """

    return refine_out

def refine(conn, turn_id: int, request: InvocationRequest, critique_response: str, unrefined_response: str, previous_attempts: list = None, attempt_number: int = 1):
    return invoke_ai(
        conn,
        turn_id,
        "refine",
        system_prompt=get_refiner_prompt(request, critique_response, previous_attempts, attempt_number),
        messages=[
            LLMMessage(
                role="user",
                content=unrefined_response,
            )
        ]
    )
