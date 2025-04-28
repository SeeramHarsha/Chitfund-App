import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { DollarSign, Award, Users, Calendar, LogIn, UserPlus, Loader2, KeyRound, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Password reset schema
const passwordResetSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Register form schema
const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  phone: z.string().min(10, "Valid phone number is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Confirm your password"),
  role: z.enum(["manager", "customer"]),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginValues = z.infer<typeof loginSchema>;
type PasswordResetValues = z.infer<typeof passwordResetSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("login");
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [firstLoginUser, setFirstLoginUser] = useState<{ id: number; username: string } | null>(null);

  // Password reset mutation
  const passwordResetMutation = useMutation({
    mutationFn: async (data: { 
      userId: number; 
      currentPassword: string; 
      newPassword: string;
    }) => {
      const res = await apiRequest("POST", `/api/users/${data.userId}/reset-password`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed. Please log in with your new password.",
      });
      setShowPasswordReset(false);
      setFirstLoginUser(null);
      loginForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update Password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Custom login mutation with first-time login check
  const checkFirstLoginMutation = useMutation({
    mutationFn: async (credentials: LoginValues) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      const data = await res.json();
      return data;
    },
    onSuccess: (data) => {
      // Check if first login AND user is a customer
      if (data.isFirstLogin && data.role === "customer") {
        console.log("First login detected for customer, showing password reset dialog");
        setFirstLoginUser({
          id: data.id,
          username: data.username,
        });
        setShowPasswordReset(true);
      } else {
        // Normal login flow for either managers or non-first-time customers
        console.log("Normal login flow", data.role, data.isFirstLogin);
        loginMutation.mutate({
          username: loginForm.getValues("username"),
          password: loginForm.getValues("password"),
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Login form
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      username: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "manager",
    },
  });

  // Password reset form
  const passwordResetForm = useForm<PasswordResetValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Handle password reset submission
  const onPasswordResetSubmit = (values: PasswordResetValues) => {
    if (!firstLoginUser) return;
    
    passwordResetMutation.mutate({
      userId: firstLoginUser.id,
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
  };

  // Redirect if already logged in - make sure this is after all hooks
  if (user) {
    // We need to ensure all hooks are called before this early return
    const redirectComponent = <Redirect to="/" />;
    return redirectComponent;
  }

  // Handle login form submission
  const onLoginSubmit = (values: LoginValues) => {
    // Use our custom check first
    checkFirstLoginMutation.mutate(values);
  };

  // Handle register form submission
  const onRegisterSubmit = (values: RegisterValues) => {
    // Remove confirmPassword before sending to the API
    const { confirmPassword, ...registrationData } = values;
    registerMutation.mutate({ ...registrationData, confirmPassword });
  };

  // Password reset modal content
  const passwordResetContent = (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <KeyRound className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold">Password Reset Required</h2>
        </div>
        <CardTitle className="text-xl">Set a New Password</CardTitle>
        <CardDescription>
          This is your first login. Please set a new password to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6" variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your account was created by a manager. For security reasons, you need to set a new password before accessing the system.
          </AlertDescription>
        </Alert>
        <Form {...passwordResetForm}>
          <form 
            onSubmit={passwordResetForm.handleSubmit(onPasswordResetSubmit)}
            className="space-y-4"
          >
            <FormField
              control={passwordResetForm.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your temporary password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={passwordResetForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your new password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={passwordResetForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm your new password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={passwordResetMutation.isPending}
            >
              {passwordResetMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Update Password
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Auth Form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
        {showPasswordReset ? (
          passwordResetContent
        ) : (
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">ChitFund Manager</h2>
              </div>
              <CardTitle className="text-xl">
                {activeTab === "login" ? "Log in to your account" : "Create an account"}
              </CardTitle>
              <CardDescription>
                {activeTab === "login"
                  ? "Enter your credentials to access your account"
                  : "Fill in the details to create a new account"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                defaultValue="login"
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register as Manager</TabsTrigger>
                </TabsList>

                {/* Login Form */}
                <TabsContent value="login">
                  <div className="space-y-4 mt-4">
                    <Form {...loginForm}>
                      <form
                        onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={loginForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter your username"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="Enter your password"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="submit"
                          className="w-full"
                          disabled={loginMutation.isPending || checkFirstLoginMutation.isPending}
                        >
                          {(loginMutation.isPending || checkFirstLoginMutation.isPending) ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Logging in...
                            </>
                          ) : (
                            <>
                              <LogIn className="mr-2 h-4 w-4" />
                              Login
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  </div>
                </TabsContent>

                {/* Register Form */}
                <TabsContent value="register">
                  <div className="space-y-4 mt-4">
                    <Form {...registerForm}>
                      <form
                        onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={registerForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="John Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={registerForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                  <Input placeholder="johndoe" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={registerForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="+91 9876543210"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="john.doe@example.com"
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={registerForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={registerForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirm Password</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Hidden role field - only managers can register from this page */}
                        <input 
                          type="hidden" 
                          {...registerForm.register("role")} 
                          value="manager" 
                        />

                        <Button
                          type="submit"
                          className="w-full"
                          disabled={registerMutation.isPending}
                        >
                          {registerMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating account...
                            </>
                          ) : (
                            <>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Register
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-center w-full text-gray-500">
                {activeTab === "login"
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <Button
                  variant="link"
                  className="p-0"
                  onClick={() =>
                    setActiveTab(activeTab === "login" ? "register" : "login")
                  }
                >
                  {activeTab === "login" ? "Register" : "Login"}
                </Button>
              </p>
            </CardFooter>
          </Card>
        )}
      </div>

      {/* Info/Hero Section */}
      <div className="hidden lg:flex flex-1 bg-primary p-12 text-white flex-col justify-center">
        <div className="max-w-md space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-6">
              Chit Fund Management System
            </h1>
            <p className="text-lg mb-8 opacity-90">
              A comprehensive solution to manage your chit funds, auctions, and payments efficiently.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Customer Management</h3>
                <p className="opacity-80">Register and manage customers with ease.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Auction Management</h3>
                <p className="opacity-80">Streamline your auction process and bidding.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Chit Group Scheduling</h3>
                <p className="opacity-80">Organize chit groups and memberships efficiently.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}