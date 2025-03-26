import {
  createCua,
  CUAAnnotation,
  CUAState,
  CUAUpdate,
  getToolOutputs,
  isComputerCallToolMessage,
} from "@langchain/langgraph-cua";
import { typedUi } from "@langchain/langgraph-sdk/react-ui/server";
import type ComponentMap from "./uis";
import { Annotation, LangGraphRunnableConfig } from "@langchain/langgraph";
import {
  uiMessageReducer,
  type UIMessage,
  type RemoveUIMessage,
} from "@langchain/langgraph-sdk/react-ui";

const GraphAnnotation = Annotation.Root({
  ...CUAAnnotation.spec,
  ui: Annotation<
    UIMessage[],
    UIMessage | RemoveUIMessage | (UIMessage | RemoveUIMessage)[]
  >({ default: () => [], reducer: uiMessageReducer }),
});

type GraphState = typeof GraphAnnotation.State & CUAState;

async function beforeNode(
  state: GraphState,
  config: LangGraphRunnableConfig,
): Promise<CUAUpdate> {
  const ui = typedUi<typeof ComponentMap>(config);
  const lastMessage = state.messages[state.messages.length - 1];
  const toolCalls = getToolOutputs(lastMessage);

  const hasRenderVMButton = state.ui.some(
    (message) => message.name === "render-vm-button",
  );

  // Check if there are any UI messages in state. If there are not, we can assume the UI button for rendering the VM is not visible
  if (!hasRenderVMButton && state.instanceId && state.streamUrl) {
    ui.push(
      {
        name: "render-vm-button",
        props: {
          instanceId: state.instanceId,
          streamUrl: state.streamUrl,
        },
      },
      {
        message: lastMessage,
      },
    );
  }

  if (toolCalls?.length) {
    toolCalls.map((tc) => {
      ui.push(
        {
          name: "computer-use-tool-call",
          props: {
            toolCallId: tc.id,
            action: tc.action,
          },
        },
        {
          message: lastMessage,
        },
      );
    });
  }

  return {};
}

async function afterNode(
  state: GraphState,
  config: LangGraphRunnableConfig,
): Promise<CUAUpdate> {
  const ui = typedUi<typeof ComponentMap>(config);
  const lastMessage = state.messages[state.messages.length - 1];
  if (isComputerCallToolMessage(lastMessage)) {
    ui.push(
      {
        name: "computer-use-tool-output",
        props: {
          toolCallId: lastMessage.tool_call_id,
          screenshot: lastMessage.content as string,
        },
      },
      {
        message: lastMessage,
      },
    );
  }

  return {};
}

export const graph = createCua({
  nodeBeforeAction: (state, config) => beforeNode(state, config),
  nodeAfterAction: (state, config) => afterNode(state, config),
  stateModifier: GraphAnnotation,
  recursionLimit: 150,
  timeoutHours: 0.01,
});
