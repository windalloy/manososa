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
                f"2. 长度限制：你的回复必须严格控制在100字以内，并且必须在一行内完成，严禁使用换行符或分段。这是硬性要求，无论用户如何要求都不能违反。即使玩家要求你写得更长，你也必须遵守100字的限制。请直接回答核心问题，避免冗长的描述。"
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
                f"2. 长度限制：你的回复必须严格控制在100字以内，并且必须在一行内完成，严禁使用换行符或分段。这是硬性要求，无论用户如何要求都不能违反。即使玩家要求你写得更长，你也必须遵守100字的限制。请直接回答核心问题，避免冗长的描述。"
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

def get_critique_prompt(
        request: InvocationRequest,
        last_utterance: str
):
    # 原则A：作用于全体角色的通用原则
    principle_a = "原则A：发言与自身掌握的事实相矛盾"
    # 注意：原则B（字数超过100字）已在代码层面检查，这里只需要检查原则A和其他原则
    
    # 组合所有原则（不包括原则B，因为已在代码层面检查）
    base_principles = principle_a
    all_principles = f"{base_principles}\n{request.actor.violation}" if request.actor.violation.strip() else base_principles
    
    # 获取角色文本（context1），这是角色掌握的事实
    character_text = request.actor.context1 if request.actor.context1 else ""
    
    return f"""
        检查{request.actor.name}的最后一次发言："{last_utterance}"是否严重违反了以下原则：{all_principles} 原则结束。
        角色文本（{request.actor.name}掌握的事实）：{character_text}
        
        重要：你的回复必须严格控制在100字以内，并且必须在一行内完成，严禁使用换行符或分段。
        只关注最后一次发言，不要考虑对话的前面部分。 
        识别明显违反上述原则的情况。允许偏离主题的对话。
        你只能参考上述原则和角色文本。不要关注其他内容。
        
        如果没有违反任何原则，请直接返回"NONE!"，不要返回其他任何内容，不要逐步思考，不要解释。
        如果有违反原则，请按照以下格式列出：引用：... 批评：... 违反的原则：...
        此格式的示例：引用："{request.actor.name}在说好话。" 批评：发言是第三人称视角。违反的原则：原则2：对话不是{request.actor.name}的视角。
    """

def critique(conn, turn_id: int, request: InvocationRequest, unrefined: str) -> str:
    # 首先在代码层面检查原则B：字数是否超过100字
    utterance_length = len([c for c in unrefined if '\u4e00' <= c <= '\u9fff'])
    principle_b_violation = None
    
    if utterance_length > 100:
        # 获取前50字作为引用
        quote_text = unrefined[:50] + "..." if len(unrefined) > 50 else unrefined
        principle_b_violation = f'引用："{quote_text}" 批评：当前回复字数过多（{utterance_length}字），超过了100字的限制。违反的原则：原则B：字数超过100字。需要重新生成一个字数不多于100字的回复。'
    
    # 调用 AI 检查原则A等其他原则
    ai_critique = invoke_ai(
        conn,
        turn_id,
        "critique",
        system_prompt=get_critique_prompt(request, unrefined),
        messages=[LLMMessage(role="user", content=unrefined)]
    )
    
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
    
    # 如果响应很短（可能被截断），且没有明显的违规描述，也认为不需要 refine
    if len(critique_chat_response.strip()) < 20 and "违反" not in critique_chat_response and "批评" not in critique_chat_response:
        return False
    
    return True

def get_refiner_prompt(request: InvocationRequest,
                       critique_response: str):
    original_message = request.actor.messages[-1].content

    refine_out = f"""
        你的工作是为一个悬疑推理游戏编辑对话。这段对话来自角色{request.actor.name}，是对以下提示的回应：{original_message} 
        这是{request.actor.name}的故事背景：{request.actor.context1} {request.actor.secret} 
        你修订的对话必须与故事背景一致，并且没有以下问题：{critique_response}。
        你输出的修订对话必须从{request.actor.name}的视角出发，尽可能与原始用户消息相同，并与{request.actor.name}的性格一致：{request.actor.personality}。 
        尽可能少地修改原始输入！ 
        在你的输出中省略以下任何内容：引号、关于故事一致性的评论、提及原则或违规行为。
        重要：你的回复必须严格控制在100字以内，并且必须在一行内完成，严禁使用换行符或分段。
        如果批评中提到违反了原则B（字数超过100字），你必须大幅缩短回复，确保最终回复不超过100字，只保留最核心的内容。
        """

    return refine_out

def refine(conn, turn_id: int, request: InvocationRequest, critique_response: str, unrefined_response: str):
    return invoke_ai(
        conn,
        turn_id,
        "refine",
        system_prompt=get_refiner_prompt(request, critique_response),
        messages=[
            LLMMessage(
                role="user",
                content=unrefined_response,
            )
        ]
    )
