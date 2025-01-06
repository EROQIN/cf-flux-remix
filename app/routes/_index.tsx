import { json, type LoaderFunction } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createAppContext } from "../context";
import { AppError } from "../utils/error";
import { Link } from "@remix-run/react";

export const loader: LoaderFunction = async ({ context }) => {
  console.log("Loader started");
  const appContext = createAppContext(context);
  const { imageGenerationService, config } = appContext;

  let cfAiStatus = "未连接";
  let configStatus = {
    API_KEY: config.API_KEY ? "已设置" : "未设置",
    CF_TRANSLATE_MODEL: config.CF_TRANSLATE_MODEL,
    CF_ACCOUNT_LIST: config.CF_ACCOUNT_LIST.length > 0 ? "已设置" : "未设置",
    CUSTOMER_MODEL_MAP: Object.keys(config.CUSTOMER_MODEL_MAP).length > 0 ? "已设置" : "未设置",
  };

  try {
    await imageGenerationService.testCfAiConnection();
    cfAiStatus = "已连接";
  } catch (error) {
    console.error("CF AI 连接测试失败:", error);
    cfAiStatus = error instanceof AppError ? `连接失败: ${error.message}` : "连接失败: 未知错误";
  }

  console.log("Loader completed");
  return json({ cfAiStatus, configStatus });
};

export default function Index() {
    const { cfAiStatus, configStatus } = useLoaderData<typeof loader>();
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-600 via-pink-500 to-red-500">
            <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-3xl shadow-2xl p-10 flex flex-col items-center">
                <h1 className="text-4xl font-extrabold text-white mb-8 text-center">CF Flux Remix</h1>
                <p className="text-white text-sm mb-4">
                    Cloudflare AI 连接状态: <span className={cfAiStatus === "已连接" ? "text-green-400" : "text-red-400"}>{cfAiStatus}</span>
                </p>

                <Link
                    to="/generate-image"
                    className="w-full text-center px-6 py-3 text-lg font-semibold text-white bg-gradient-to-r from-indigo-500 to-indigo-700 rounded-xl transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                    使用 CF 的 Flux 生成图片
                </Link>

                <div className="mt-6 text-white text-sm">
                    <p>配置状态:</p>
                    <ul className="list-disc list-inside mt-2">
                        <li>API_KEY: <span className={configStatus.API_KEY === "已设置" ? "text-green-400" : "text-red-400"}>{configStatus.API_KEY}</span></li>
                        <li>CF_TRANSLATE_MODEL: <span className="text-gray-300">{configStatus.CF_TRANSLATE_MODEL}</span></li>
                        <li>CF_ACCOUNT_LIST: <span className={configStatus.CF_ACCOUNT_LIST === "已设置" ? "text-green-400" : "text-red-400"}>{configStatus.CF_ACCOUNT_LIST}</span></li>
                        <li>CUSTOMER_MODEL_MAP: <span className={configStatus.CUSTOMER_MODEL_MAP === "已设置" ? "text-green-400" : "text-red-400"}>{configStatus.CUSTOMER_MODEL_MAP}</span></li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
