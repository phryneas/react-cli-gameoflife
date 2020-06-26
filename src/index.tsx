import React, { useEffect, useState } from "react";
import { render, Text, Box, Newline } from "ink";

import { useLocalSlice, PayloadAction } from "use-local-slice";

require("keypress")(process.stdin);
process.stdin.setRawMode(true);
process.stdin.resume();

type State = {
  status: "paused" | "running";
  width: number;
  height: number;
  cursor: { x: number; y: number };
  field: boolean[];
  speed: number;
};

function nextTurn(field: boolean[], width: number): boolean[] {
  function nAt(x: number, y: number) {
    if (x < 0 || x >= width || y < 0 || y * width + x > field.length) {
      return false;
    }
    return field[y * width + x];
  }
  function neighbors(pos: number) {
    const x = pos % width;
    const y = (pos - x) / width;
    let n = 0;
    for (let dx = -1; dx < 2; dx++)
      for (let dy = -1; dy < 2; dy++) {
        if (dx === 0 && dy === 0) {
          continue;
        }
        if (nAt(x + dx, y + dy)) {
          n++;
        }
      }
    return n;
  }

  return field.map((v, pos) => {
    const n = neighbors(pos);
    if (n === 3 || (v && n === 2)) {
      return true;
    }
    return false;
  });
}

const Field = (props: { width: number; height: number }) => {
  const [state, dispatch] = useLocalSlice({
    initialState: null as State | null,
    reducers: {
      reset(
        _,
        {
          payload: { width, height },
        }: PayloadAction<{ width: number; height: number }>
      ) {
        return {
          status: "paused",
          width,
          height,
          cursor: { x: 0, y: 0 },
          speed: 500,
          field: new Array<boolean>(height * width).fill(false),
        };
      },
      cursorLeft(state) {
        if (state) {
          state.cursor.x = Math.max(0, state.cursor.x - 1);
        }
      },
      cursorRight(state) {
        if (state) {
          state.cursor.x = Math.min(state.width - 1, state.cursor.x + 1);
        }
      },
      cursorUp(state) {
        if (state) {
          state.cursor.y = Math.max(0, state.cursor.y - 1);
        }
      },
      cursorDown(state) {
        if (state) {
          state.cursor.y = Math.min(state.height - 1, state.cursor.y + 1);
        }
      },
      toggle(state) {
        if (!state) {
          return;
        }
        state.field[state.cursor.y * state.width + state.cursor.x] = !state
          .field[state.cursor.y * state.width + state.cursor.x];
      },
      togglePause(state) {
        if (!state) {
          return;
        }
        if (state.status === "paused") {
          state.status = "running";
        } else {
          state.status = "paused";
        }
      },
      nextTurn(state) {
        if (!state) {
          return;
        }
        state.field = nextTurn(state.field, state.width);
      },
      increaseSpeed(state) {
        if (state) {
          state.speed = Math.max(10, state.speed - 10);
        }
      },
      decreaseSpeed(state) {
        if (state) {
          state.speed += 10;
        }
      },
    },
  });

  const [lastKey, setLastKey] = useState("");

  useEffect(() => {
    dispatch.reset({ width: props.width, height: props.height });
  }, [props.width, props.height]);

  useEffect(() => {
    function listener(
      str: string,
      key?: { ctrl: boolean; meta: boolean; shift: boolean; name: string }
    ) {
      switch (key?.name) {
        case "c":
          if (key.ctrl) {
            process.exit(0);
          }
          break;
        case "left":
        case "a":
          dispatch.cursorLeft();
          break;
        case "right":
        case "d":
          dispatch.cursorRight();
          break;
        case "up":
        case "w":
          dispatch.cursorUp();
          break;
        case "down":
        case "s":
          dispatch.cursorDown();
          break;
        case "space":
          dispatch.toggle();
          break;
        case "r":
          dispatch.reset({ width: props.width, height: props.height });
          break;
        case "return":
          dispatch.togglePause();
          break;
        default:
          switch (str) {
            case "+":
              dispatch.increaseSpeed();
              break;
            case "-":
              dispatch.decreaseSpeed();
              break;
          }
          setLastKey(JSON.stringify({ str, key }));
      }
    }
    process.stdin.on("keypress", listener);
    return () => void process.stdin.off("keypress", listener);
  }, []);

  useEffect(() => {
    if (state?.speed) {
      const timer = setInterval(function mainLoop() {
        if (state.status === "running") {
          dispatch.nextTurn();
        }
      }, state.speed);

      return () => {
        clearInterval(timer);
      };
    }
  }, [state?.speed, state?.status]);

  return (
    <Box flexDirection="column">
      <Text>
        last rendered at {Date.now()}, speed: {state?.speed}, last key pressed
        was {lastKey}
      </Text>
      {state && (
        <Box
          width={state.width + 2}
          height={state.height + 2}
          borderStyle="double"
          flexDirection="row"
        >
          <Text>
            {state.field.map((item, pos) => {
              const x = pos % state.width;
              const y = (pos - x) / state.width;
              return (
                <React.Fragment key={pos}>
                  <Text
                    backgroundColor={
                      state.cursor.x === x && state.cursor.y === y
                        ? item
                          ? "redBright"
                          : "red"
                        : item
                        ? "white"
                        : undefined
                    }
                  >
                    {" "}
                  </Text>
                  {x + 1 === state.width && <Newline />}
                </React.Fragment>
              );
            })}
          </Text>
        </Box>
      )}
    </Box>
  );
};

render(
  <Box>
    <Field width={80} height={15} />
    <Box marginTop={1} marginLeft={2} borderStyle="single">
      <Text>
        move cursor:
        <Newline />
        wasd/arrow keys
        <Newline />
        <Newline />
        toggle cell:
        <Newline />
        space
        <Newline />
        <Newline />
        play/pause:
        <Newline />
        return
        <Newline />
        <Newline />
        faster/slower:
        <Newline />
        plus/minus keys
        <Newline />
        <Newline />
        reset:
        <Newline />r
      </Text>
    </Box>
  </Box>
);
