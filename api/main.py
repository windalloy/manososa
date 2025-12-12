from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from invoke_types import InvocationRequest, InvocationResponse
from db import pool
import json
import random
from settings import MODEL, MODEL_KEY
from ai import respond_initial, critique, refine, check_whether_to_refine
from datetime import datetime, timezone
import time

app = FastAPI()

origins = [
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def create_conversation_turn(conn, request: InvocationRequest) -> int:
    if conn is None:
        return 0

    try:
        with conn.cursor() as cur:        
            serialized_chat_messages = [msg.model_dump() for msg in request.actor.messages]
            cur.execute(
                "INSERT INTO conversation_turns (session_id, character_file_version, model, model_key, actor_name, chat_messages) "
                "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                (request.session_id, request.character_file_version,
                 MODEL, MODEL_KEY, request.actor.name, json.dumps(serialized_chat_messages), )
            )
            turn_id = cur.fetchone()[0]
        conn.commit()
        return turn_id
    except Exception as e:
        conn.rollback()
        print(f"Error in create_conversation_turn: {e}")
        return 0

def store_response(conn, turn_id: int, response: InvocationResponse):
    try:
        with conn.cursor() as cur:
            cur.execute(
               "UPDATE conversation_turns SET original_response = %s, critique_response = %s, problems_detected = %s, "
               "final_response = %s, refined_response = %s, finished_at= %s WHERE id=%s",
                  (response.original_response, response.critique_response, response.problems_detected, response.final_response,
                    response.refined_response, datetime.now(tz=timezone.utc).isoformat(), turn_id, )
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Error in store_response: {e}")

def prompt_ai(conn, request: InvocationRequest) -> InvocationResponse:
    turn_id = create_conversation_turn(conn, request)
    print(f"Serving turn {turn_id}")

    # UNREFINED
    unrefined_response = respond_initial(conn, turn_id, request)

    print(f"\nunrefined_response: {unrefined_response}\n")

    # 所有角色都进行审查，原则A（发言与自身掌握的事实相矛盾）作用于所有角色
    critique_response = critique(conn, turn_id, request, unrefined_response)

    print(f"\ncritique_response: {critique_response}\n")

    problems_found = check_whether_to_refine(critique_response)

    # 循环审查和修改机制：最多尝试2次
    MAX_REFINE_ATTEMPTS = 2
    refine_attempts = 0
    current_response = unrefined_response
    all_critique_responses = [critique_response]  # 记录所有审查结果
    previous_refine_attempts = []  # 记录之前失败的修改尝试
    refined_response = None
    
    while problems_found and refine_attempts < MAX_REFINE_ATTEMPTS:
        refine_attempts += 1
        print(f"\n=== 第 {refine_attempts} 次修改 ===\n")
        
        # 进行修改，传递之前失败的尝试历史和当前尝试次数
        refined_response = refine(conn, turn_id, request, critique_response, current_response, previous_refine_attempts, refine_attempts)
        print(f"\nrefined_response (attempt {refine_attempts}): {refined_response}\n")
        
        # 对修改后的内容进行审查
        critique_response = critique(conn, turn_id, request, refined_response)
        print(f"\ncritique_response (attempt {refine_attempts}): {critique_response}\n")
        
        all_critique_responses.append(critique_response)
        
        # 检查是否通过审查
        problems_found = check_whether_to_refine(critique_response)
        
        if not problems_found:
            # 审查通过，使用修改后的回复
            current_response = refined_response
            print(f"\n审查通过，使用第 {refine_attempts} 次修改后的回复\n")
            break
        else:
            # 审查未通过，记录这次失败的尝试，继续使用修改后的回复作为下一次修改的基础
            previous_refine_attempts.append(refined_response)
            current_response = refined_response
    
    # 如果超过最大尝试次数仍然不通过，直接使用最后一次修改后的内容
    if problems_found and refine_attempts >= MAX_REFINE_ATTEMPTS:
        print(f"\n超过 {MAX_REFINE_ATTEMPTS} 次修改仍不通过，直接使用最后一次修改后的内容\n")
        final_response = current_response
        refined_response = current_response
    else:
        final_response = current_response

    # 合并所有审查结果（用于记录）
    combined_critique = "\n---\n".join(all_critique_responses)

    response = InvocationResponse(
        original_response=unrefined_response,
        critique_response=combined_critique,
        problems_detected=problems_found and refine_attempts >= MAX_REFINE_ATTEMPTS,  # 只有最终失败才标记为有问题
        final_response=final_response,
        refined_response=refined_response,
    )

    # 如果当前角色是二阶堂希罗，在最终回复前后加上括号（在审查和修复之后）
    if request.actor.name == "二阶堂希罗":
        # 移除已有的括号，避免重复嵌套
        final_response_text = response.final_response
        # 如果已经以中文括号开头和结尾，移除它们
        if final_response_text.startswith("（") and final_response_text.endswith("）"):
            final_response_text = final_response_text[1:-1]
        # 添加括号
        final_response_text = f"（{final_response_text}）"
        
        response = InvocationResponse(
            original_response=response.original_response,
            critique_response=response.critique_response,
            problems_detected=response.problems_detected,
            final_response=final_response_text,
            refined_response=response.refined_response,
        )

    if conn is not None:
        store_start = time.time()
        store_response(conn, turn_id, response)
        print(f"Stored in {time.time() - store_start:.2f}s")

    return response

@app.post("/invoke/")
async def invoke(request: InvocationRequest):
    start_time = time.time()
    connection_pool = pool()
    
    conn = None
    try:
        # Use a mock connection object or None if the pool is not available
        conn = connection_pool.getconn() if connection_pool else None
        
        conn_time = time.time()
        print(f"Conn in {conn_time - start_time:.2f}s")
        response = prompt_ai(conn, request)
        response_time = time.time()
        print(f"Response in {response_time - conn_time:.2f}s")

        return response.model_dump()
    except Exception as e:
        print(f"Error in invoke endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            connection_pool.putconn(conn)

@app.get("/")
async def root():
    return {"message": "AI Murder Mystery API is running", "status": "ok"}

@app.get("/health")
async def health_check():
    # TODO: Implement a better health check mechanism here
    return {"status": "ok"}
