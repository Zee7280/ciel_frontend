import * as React from "react"
import { cn } from "@/lib/utils"
import { UploadCloud } from "lucide-react"

export interface FileUploadProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
}

const FileUpload = React.forwardRef<HTMLInputElement, FileUploadProps>(
    ({ className, label, ...props }, ref) => {
        return (
            <div className={cn("flex flex-col items-center justify-center w-full", className)}>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-8 h-8 mb-3 text-slate-400" />
                        <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-slate-500">{label || "SVG, PNG, JPG or GIF (MAX. 800x400px)"}</p>
                    </div>
                    <input type="file" className="hidden" ref={ref} {...props} />
                </label>
            </div>
        )
    }
)
FileUpload.displayName = "FileUpload"

export { FileUpload }
