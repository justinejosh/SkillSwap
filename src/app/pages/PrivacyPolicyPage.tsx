import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { ArrowLeft, Shield, Lock, Eye, UserCheck } from "lucide-react";

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-blue-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="size-6" />
          </Button>
          <h1 className="text-2xl font-bold text-blue-900">Privacy & Security</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Security Features */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <Shield className="size-6 text-blue-600" />
              Our Security Measures
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 p-4 rounded-lg bg-blue-50 border border-blue-100">
              <Lock className="size-8 text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-blue-900">Password Encryption</h3>
                <p className="text-sm text-blue-700 mt-1">
                  All passwords are encrypted using industry-standard bcrypt hashing with salt rounds.
                  We never store plain-text passwords in our database.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-lg bg-blue-50 border border-blue-100">
              <UserCheck className="size-8 text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-blue-900">Role-Based Access Control</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Our system implements RBAC (Role-Based Access Control) with distinct permissions for Users,
                  Admins, and Moderators. Each role has specific access privileges.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-lg bg-blue-50 border border-blue-100">
              <Eye className="size-8 text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-blue-900">Data Privacy Controls</h3>
                <p className="text-sm text-blue-700 mt-1">
                  You control what information is visible to other users. Profile visibility settings
                  allow you to hide personal details from public view.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Policy */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-blue-800">
            <section>
              <h3 className="font-medium text-blue-900 mb-2">1. Information We Collect</h3>
              <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                <li>Profile information (name, email, skills)</li>
                <li>Learning and teaching preferences</li>
                <li>Session history and ratings</li>
                <li>Messages and communications between users</li>
              </ul>
            </section>

            <section>
              <h3 className="font-medium text-blue-900 mb-2">2. How We Use Your Information</h3>
              <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                <li>To facilitate skill swap matching</li>
                <li>To improve our recommendation algorithm</li>
                <li>To communicate important platform updates</li>
                <li>To ensure platform security and prevent fraud</li>
              </ul>
            </section>

            <section>
              <h3 className="font-medium text-blue-900 mb-2">3. Data Sharing</h3>
              <p className="text-sm">
                We DO NOT sell or share your personal information with third parties for marketing purposes.
                Your data is only used within the platform to connect you with other learners.
              </p>
            </section>

            <section>
              <h3 className="font-medium text-blue-900 mb-2">4. Your Rights</h3>
              <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                <li>Right to access your data</li>
                <li>Right to correct inaccurate information</li>
                <li>Right to delete your account</li>
                <li>Right to export your data</li>
                <li>Right to opt-out of communications</li>
              </ul>
            </section>

            <section>
              <h3 className="font-medium text-blue-900 mb-2">5. Data Retention</h3>
              <p className="text-sm">
                We retain your data only as long as your account is active or as needed to provide services.
                After account deletion, personal data is removed within 30 days, except where required by law.
              </p>
            </section>

            <section>
              <h3 className="font-medium text-blue-900 mb-2">6. Security Measures</h3>
              <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                <li>SSL/TLS encryption for data transmission</li>
                <li>Encrypted password storage (bcrypt)</li>
                <li>Regular security audits</li>
                <li>Two-factor authentication (optional)</li>
                <li>Secure session management</li>
              </ul>
            </section>

            <section>
              <h3 className="font-medium text-blue-900 mb-2">7. Cookies and Tracking</h3>
              <p className="text-sm">
                We use essential cookies for authentication and session management. No third-party tracking
                or advertising cookies are used without your explicit consent.
              </p>
            </section>

            <section>
              <h3 className="font-medium text-blue-900 mb-2">8. Contact Us</h3>
              <p className="text-sm">
                If you have questions about our privacy practices, please contact us at
                <a href="mailto:privacy@skillswap.com" className="text-blue-600 hover:underline ml-1">
                  privacy@skillswap.com
                </a>
              </p>
            </section>

            <div className="pt-4 border-t border-blue-200 text-xs text-blue-600">
              Last updated: January 27, 2026
            </div>
          </CardContent>
        </Card>

        {/* Technical Implementation */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">Technical Implementation Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-blue-700">
            <p className="font-medium text-blue-900">For Academic/Thesis Documentation:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Authentication:</strong> JWT-based authentication with refresh tokens</li>
              <li><strong>Password Security:</strong> Bcrypt hashing with 12 salt rounds</li>
              <li><strong>Authorization:</strong> Role-based access control (User/Admin/Moderator)</li>
              <li><strong>API Security:</strong> Rate limiting, input validation, SQL injection prevention</li>
              <li><strong>Data Encryption:</strong> AES-256 for sensitive data at rest</li>
              <li><strong>Session Management:</strong> Secure HTTP-only cookies with CSRF protection</li>
              <li><strong>Audit Logging:</strong> All critical actions logged for security monitoring</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
