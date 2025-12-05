from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from invoke_types import InvocationRequest, InvocationResponse
from db import pool
import json
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

    # 如果 violation 为空，跳过审查流程，直接使用原始响应
    violation = request.actor.violation.strip() if request.actor.violation else ""
    if not violation:
        print("\nSkipping critique and refine (violation is empty)\n")
        final_response = unrefined_response
        response = InvocationResponse(
            original_response=unrefined_response,
            critique_response="NONE! (violation is empty, critique skipped)",
            problems_detected=False,
            final_response=final_response,
            refined_response=None,
        )
    else:
        critique_response = critique(conn, turn_id, request, unrefined_response)

        print(f"\ncritique_response: {critique_response}\n")

        problems_found = check_whether_to_refine(critique_response)

        if problems_found:
            refined_response = refine(conn, turn_id, request, critique_response, unrefined_response)
            
            final_response = refined_response
        else:
            final_response = unrefined_response
            refined_response = None

        response = InvocationResponse(
            original_response=unrefined_response,
            critique_response=critique_response,
            problems_detected=problems_found,
            final_response=final_response,
            refined_response=refined_response,
        )

    # 如果当前角色是二阶堂希罗，在最终回复前后加上括号（在审查和修复之后）
    if request.actor.name == "二阶堂希罗":
        response = InvocationResponse(
            original_response=response.original_response,
            critique_response=response.critique_response,
            problems_detected=response.problems_detected,
            final_response=f"（{response.final_response}）",
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
