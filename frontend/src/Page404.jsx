// Page404.jsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { useNavigate } from "react-router-dom";
import { Theme } from "@radix-ui/themes";

export default function Page404() {
  const navigate = useNavigate();

  return (
    <Theme>
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <Card className="w-full max-w-md border border-gray-200 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-medium text-center">
            404
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex flex-col items-center justify-center space-y-4">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Page not found</h1>
            <p className="text-gray-600">
              Sorry, we couldn't find the page you're looking for.
            </p>
          </div>
          
          <div className="w-full max-w-xs">
            <svg
              viewBox="0 0 200 200"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-auto"
            >
              <path
                fill="#F3F4F6"
                d="M45.1,-65.3C57.9,-57.7,67.3,-44.3,72.3,-29.7C77.3,-15.1,77.9,0.8,73.3,13.5C68.7,26.2,58.9,35.7,47.1,44.2C35.3,52.7,21.5,60.2,4.8,63.8C-11.9,67.4,-31.5,67.1,-46.9,58.9C-62.3,50.7,-73.5,34.6,-76.1,17.2C-78.7,-0.2,-72.7,-18.9,-61.8,-34.1C-50.9,-49.3,-35.1,-61,-20.8,-68.1C-6.5,-75.2,6.3,-77.7,20.1,-73.8C33.9,-69.9,48.6,-59.6,45.1,-65.3Z"
                transform="translate(100 100)"
              />
              <text
                x="100"
                y="100"
                fontFamily="Arial"
                fontSize="40"
                fontWeight="bold"
                textAnchor="middle"
                fill="#111827"
              >
                404
              </text>
            </svg>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Go back
          </Button>
        </CardFooter>
      </Card>
    </div>
    </Theme>
  );
}