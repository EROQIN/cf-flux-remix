import type { FC, ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { json } from "@remix-run/cloudflare";
import { useActionData, Form, useNavigation, useLoaderData } from "@remix-run/react";
import type { ActionFunction, LoaderFunction } from "@remix-run/cloudflare";
import { createAppContext } from "../context";

// Loader 函数用于在组件加载时获取初始数据
export const loader: LoaderFunction = async ({ context }) => {
  // 创建应用上下文，包含配置信息
  const appContext = createAppContext(context);
  const { config } = appContext;
  // 从配置中提取模型信息，转换为 { id, path } 格式的数组
  const models = Object.entries(config.CUSTOMER_MODEL_MAP).map(([id, path]) => ({ id, path }));
  // 返回模型信息和配置信息
  return json({ models, config });
};

// Action 函数用于处理表单提交
export const action: ActionFunction = async ({ request, context }: { request: Request; context: any }) => {
  // 创建应用上下文
  const appContext = createAppContext(context);
  const { imageGenerationService, config } = appContext;

  console.log("Generate image action started");
  console.log("Config:", JSON.stringify(config, null, 2));

  // 获取表单数据
  const formData = await request.formData();
  const prompt = formData.get("prompt") as string; // 获取用户输入的提示词
  const enhance = formData.get("enhance") === "true"; // 获取是否启用增强提示词
  const modelId = formData.get("model") as string; // 获取选择的模型 ID
    const width = formData.get("width") as string; // 获取用户输入的宽度
    const height = formData.get("height") as string; // 获取用户输入的高度
  const numSteps = parseInt(formData.get("numSteps") as string, 10); // 获取生成步骤数

    const size = `${width}x${height}`; // 拼接尺寸字符串

  console.log("Form data:", { prompt, enhance, modelId, size, numSteps });

  // 验证提示词是否为空
  if (!prompt) {
    return json({ error: "未找到提示词" }, { status: 400 });
  }

  // 验证模型是否存在
  const model = config.CUSTOMER_MODEL_MAP[modelId];
  if (!model) {
    return json({ error: "无效的模型" }, { status: 400 });
  }

  try {
    // 调用图片生成服务生成图片
    const result = await imageGenerationService.generateImage(
      enhance ? `---tl ${prompt}` : prompt, // 如果启用增强，则在提示词前添加 ---tl
      model,
      size,
      numSteps
    );
    console.log("Image generation successful");
    return json(result);
  } catch (error) {
    // 捕获生成图片过程中的错误
    console.error("生成图片时出错:", error);
    if (error instanceof AppError) {
      return json({ error: `生成图片失败: ${error.message}` }, { status: error.status || 500 });
    }
    return json({ error: "生成图片失败: 未知错误" }, { status: 500 });
  }
};

// GenerateImage 组件
const GenerateImage: FC = () => {
  // 从 loader 中获取数据
  const { models, config } = useLoaderData<typeof loader>();
  // 使用 useState 管理组件状态
  const [prompt, setPrompt] = useState(""); // 用户输入的提示词
  const [enhance, setEnhance] = useState(false); // 是否启用增强提示词
  const [model, setModel] = useState(config.CUSTOMER_MODEL_MAP["FLUX.1-Schnell-CF"]); // 选择的模型
    const [width, setWidth] = useState("1024"); // 图片宽度
    const [height, setHeight] = useState("1024"); // 图片高度
  const [numSteps, setNumSteps] = useState(config.FLUX_NUM_STEPS); // 生成步骤数
  const actionData = useActionData<typeof action>(); // 获取 action 函数返回的数据
  const navigation = useNavigation(); // 获取导航状态

  const isSubmitting = navigation.state === "submitting"; // 判断是否正在提交表单

  // 切换增强提示词状态
  const handleEnhanceToggle = () => {
    setEnhance(!enhance);
  };

  // 重置表单
  const handleReset = () => {
    setPrompt("");
    setEnhance(false);
    setModel(config.CUSTOMER_MODEL_MAP["FLUX.1-Schnell-CF"]);
      setWidth("1024");
      setHeight("1024");
    setNumSteps(config.FLUX_NUM_STEPS);
  };

  // 处理提示词输入框内容变化
  const handlePromptChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  // 处理表单提交事件
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (isSubmitting) {
      e.preventDefault(); // 如果正在提交，则阻止默认的表单提交行为
    }
  };

  // 处理模型选择变化
  const handleModelChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setModel(e.target.value);
  };

    // 处理宽度输入变化
    const handleWidthChange = (e: ChangeEvent<HTMLInputElement>) => {
        setWidth(e.target.value);
    };

    // 处理高度输入变化
    const handleHeightChange = (e: ChangeEvent<HTMLInputElement>) => {
        setHeight(e.target.value);
    };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 px-4">
      <div className="relative bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-3xl shadow-2xl p-10 max-w-md w-full">
        <h1 className="text-4xl font-extrabold text-white mb-8 text-center drop-shadow-lg">
          使用 CF 生成图片
        </h1>
        <Form method="post" className="space-y-8" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="prompt" className="block text-white text-lg font-semibold mb-3">
              输入提示词：
            </label>
            {/* 将 input 元素改为 textarea 元素，并添加 rows 属性使其可换行 */}
            <textarea
              id="prompt"
              name="prompt"
              value={prompt}
              onChange={handlePromptChange}
              className="w-full px-5 py-3 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white bg-opacity-20 text-white placeholder-white placeholder-opacity-70 transition duration-300 ease-in-out hover:bg-opacity-30 resize-none"
              placeholder="请输入您的提示词..."
              required
              rows={4} // 设置默认显示 4 行
            />
          </div>
          <div>
            <label htmlFor="model" className="block text-white text-lg font-semibold mb-3">
              选择模型：
            </label>
            <select
              id="model"
              name="model"
              value={model}
              onChange={handleModelChange}
              className="w-full px-5 py-3 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white bg-opacity-20 text-white transition duration-300 ease-in-out hover:bg-opacity-30"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id}
                </option>
              ))}
            </select>
          </div>
            <div className="flex space-x-4">
                <div className="flex-1">
                    <label htmlFor="width" className="block text-white text-lg font-semibold mb-3">
                        宽度：
                    </label>
                    <input
                        type="number"
                        id="width"
                        name="width"
                        value={width}
                        onChange={handleWidthChange}
                        className="w-full px-5 py-3 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white bg-opacity-20 text-white transition duration-300 ease-in-out hover:bg-opacity-30"
                    />
                </div>
                <div className="flex-1">
                    <label htmlFor="height" className="block text-white text-lg font-semibold mb-3">
                        高度：
                    </label>
                    <input
                        type="number"
                        id="height"
                        name="height"
                        value={height}
                        onChange={handleHeightChange}
                        className="w-full px-5 py-3 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white bg-opacity-20 text-white transition duration-300 ease-in-out hover:bg-opacity-30"
                    />
                </div>
            </div>
          <div>
            <label htmlFor="numSteps" className="block text-white text-lg font-semibold mb-3">
              生成步数：
            </label>
            <input
              type="number"
              id="numSteps"
              name="numSteps"
              value={numSteps}
              onChange={(e) => setNumSteps(parseInt(e.target.value, 10))}
              min="4"
              max="8"
              className="w-full px-5 py-3 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white bg-opacity-20 text-white transition duration-300 ease-in-out hover:bg-opacity-30"
            />
          </div>
          <div className="flex flex-col sm:flex-row justify-between space-y-4 sm:space-y-0">
            <button
              type="button"
              onClick={handleEnhanceToggle}
              className={`flex-1 px-5 py-3 rounded-xl text-lg font-semibold text-white transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400
                          ${enhance ? "bg-gradient-to-r from-green-400 to-green-600" : "bg-gradient-to-r from-gray-400 to-gray-600"}`}
              disabled={isSubmitting}
            >
              {enhance ? "已强化提示词" : "是否强化提示词"}
            </button>
            <input type="hidden" name="enhance" value={enhance.toString()} />
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 px-5 py-3 rounded-xl text-lg font-semibold text-white bg-gradient-to-r from-yellow-400 to-yellow-600 transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              disabled={isSubmitting}
            >
              重置
            </button>
            <button
              type="submit"
              className={`flex-1 px-5 py-3 rounded-xl text-lg font-semibold text-white transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400
                          ${isSubmitting ? "bg-gray-500 cursor-not-allowed" : "bg-gradient-to-r from-indigo-500 to-indigo-700"}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? "生成中..." : "提交"}
            </button>
          </div>
        </Form>
        {actionData && actionData.image && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-white mb-4">生成的图片：</h2>
            <img src={`data:image/jpeg;base64,${actionData.image}`} alt="Generated Image" className="w-full rounded-xl shadow-lg" />
          </div>
        )}
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000 -z-10"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000 -z-10"></div>
      </div>
    </div>
  );
};

export default GenerateImage;
