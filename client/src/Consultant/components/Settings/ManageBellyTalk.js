import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import ReportIcon from "@mui/icons-material/Description";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import CloseIcon from "@mui/icons-material/Close";
import "../../styles/settings/managebellytalk.css";
import { jsPDF } from "jspdf";
import { getCookie } from "../../../utils/getCookie";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkHtml from "remark-html";
import { remark } from "remark";

const ManageBellyTalk = () => {
  const [user, setUser] = useState({});
  const userID = getCookie("userID");
  const API_URL = process.env.REACT_APP_API_URL;
  const OPENAI_URL = process.env.REACT_APP_OPENAI_URL;
  const token = getCookie("token");

  // State for the fetched data
  const [data, setData] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [open, setOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [isFetchingReport, setIsFetchingReport] = useState(false);
  const [reportData, setReportData] = useState("");
  const [reportTitle, setReportTitle] = useState("");
  const [showLibrary, setShowLibrary] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageToUpload, setImageToUpload] = useState(null);
  const [bookCover, setBookCover] = useState("");

  const handleCloseModal = () => {
    // Your logic to close the modal, e.g., setShowLibrary(false)
    setShowLibrary(false);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0]; // Get the first file
    setImageToUpload(event.target.files[0]); // Set the image to upload
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result); // Set the image preview
      };
      reader.readAsDataURL(file); // Read the file as a data URL (base64 encoded)
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null); // Clear the selected image
    setImageToUpload(null); // Clear the image to upload
  };

  const handleCardClick = (category) => {
    setSelectedCategory(category);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedCategory(null);
    setReportData("");
    setReportTitle("");
  };

  const handleViewReports = async () => {
    if (!selectedCategory) return null;

    const categoryData = data.find((item) => item.name === selectedCategory);

    if (!categoryData) return null;

    if (categoryData.Engagement < 2)
      return alert("Engagement requirements not reached for this action.");

    setShowReport(!showReport); // Toggle the visibility state of the report

    // Add logic to view report here
    if (!reportData) {
      setIsFetchingReport(true);
      const summaryResponse = await axios.get(
        `${API_URL}/analytics/article?category=${encodeURIComponent(
          selectedCategory
        )}`,
        {
          headers: {
            Authorization: token,
          },
        }
      );

      if (summaryResponse.data) {
        if (
          summaryResponse.data.article &&
          summaryResponse.data.article.engagement === categoryData.Engagement
        ) {
          setReportData(
            `${summaryResponse.data.article.title}\n${summaryResponse.data.article.content}`
          );
          setReportTitle(
            summaryResponse.data.article.title.replace(/^#+\s*/, "")
          );
          setIsFetchingReport(false);
        } else {
          // Start the `toSummarize` structure
          const toSummarize = {
            category: selectedCategory, // Selected category (e.g., Health & Wellness)
            posts: categoryData.PostContent.map((content, index) => {
              return {
                content, // Post content
                comments: categoryData.PostComments[index], // Associated comments
              };
            }),
          };

          const response = await axios.post(
            `${OPENAI_URL}/article`,
            toSummarize,
            {
              headers: {
                Authorization: token,
              },
            }
          );

          let summary = response.data.summary;
          const title = summary.split("\n")[0]; // Extract the first line as the title
          summary = summary.split("\n").slice(1).join("\n"); // Remove the first line from the summary

          const generatedArticleToSave = {
            engagement: categoryData.Engagement,
            title: title,
            fullTitle: title,
            content: summary,
            category: selectedCategory,
          };

          if (summaryResponse.data.article) {
            await axios.put(
              `${API_URL}/analytics/article?category=${encodeURIComponent(
                selectedCategory
              )}`,
              generatedArticleToSave,
              {
                headers: {
                  Authorization: token,
                },
              }
            );
          } else {
            await axios.post(
              `${API_URL}/analytics/article`,
              generatedArticleToSave,
              {
                headers: {
                  Authorization: token,
                },
              }
            );
          }
          setReportData(response.data.summary);
          setReportTitle(title);
          setIsFetchingReport(false);
        }
      }
    }
  };

  async function uploadBookCover() {
    if (imageToUpload) {
      const formData = new FormData();
      formData.append("picture", imageToUpload);

      try {
        const response = await axios.post(
          `${API_URL}/upload/a?userId=${userID}`,
          formData,
          {
            headers: {
              Authorization: token,
              "Content-Type": "multipart/form-data",
            },
          }
        );
        return response.data.pictureLink;
      } catch (err) {
        console.error(err);
      }
    }
  }

  const handleShowAddToLibrary = async () => {
    if (!selectedCategory) return null;

    const categoryData = data.find((item) => item.name === selectedCategory);

    if (!categoryData) return null;

    if (categoryData.Engagement < 2)
      return alert("Engagement requirements not reached for this action.");

    // Add logic to add to library here
    setShowLibrary(!showLibrary);

    if (!reportData) {
      setIsFetchingReport(true);
      const summaryResponse = await axios.get(
        `${API_URL}/analytics/article?category=${encodeURIComponent(
          selectedCategory
        )}`,
        {
          headers: {
            Authorization: token,
          },
        }
      );

      if (summaryResponse.data) {
        if (
          summaryResponse.data.article &&
          summaryResponse.data.article.engagement === categoryData.Engagement
        ) {
          setReportData(
            `${summaryResponse.data.article.title}\n${summaryResponse.data.article.content}`
          );
          setReportTitle(
            summaryResponse.data.article.title.replace(/^#+\s*/, "")
          );
          setIsFetchingReport(false);
        } else {
          // Start the `toSummarize` structure
          const toSummarize = {
            category: selectedCategory, // Selected category (e.g., Health & Wellness)
            posts: categoryData.PostContent.map((content, index) => {
              return {
                content, // Post content
                comments: categoryData.PostComments[index], // Associated comments
              };
            }),
          };

          const response = await axios.post(
            `${OPENAI_URL}/article`,
            toSummarize,
            {
              headers: {
                Authorization: token,
              },
            }
          );

          let summary = response.data.summary;
          const title = summary.split("\n")[0]; // Extract the first line as the title
          summary = summary.split("\n").slice(1).join("\n"); // Remove the first line from the summary

          const generatedArticleToSave = {
            engagement: categoryData.Engagement,
            title: title,
            fullTitle: title,
            content: summary,
            category: selectedCategory,
          };

          if (summaryResponse.data.article) {
            await axios.put(
              `${API_URL}/analytics/article?category=${encodeURIComponent(
                selectedCategory
              )}`,
              generatedArticleToSave,
              {
                headers: {
                  Authorization: token,
                },
              }
            );
          } else {
            await axios.post(
              `${API_URL}/analytics/article`,
              generatedArticleToSave,
              {
                headers: {
                  Authorization: token,
                },
              }
            );
          }
          setReportData(response.data.summary);
          setReportTitle(title.replace(/^#+\s*/, ""));
          setIsFetchingReport(false);
        }
      }
    }
  };

  const convertMarkdownToHTML = async (markdown) => {
    const html = await remark().use(remarkHtml).process(markdown);
    return html.toString();
  };

  const handleAddToLibrary = async () => {
    if (reportData.trim() === "") return alert("No available report");
    if (!imageToUpload) return alert("Please select a cover image");
    const bookCover = await uploadBookCover();

    const convertedReportContent = await convertMarkdownToHTML(reportData);
    const reportContent = convertedReportContent
      .split("\n")
      .slice(1)
      .join("\n");

    const newBook = {
      userId: userID,
      reviewedBy: user.name,
      author: "System Generated",
      title: reportTitle,
      fullTitle: reportTitle,
      content: JSON.stringify(reportContent),
      category: selectedCategory,
      status: "Approved",
      picture: bookCover,
    };

    try {
      await axios.post(`${API_URL}/article`, newBook, {
        headers: {
          Authorization: token,
          "Content-Type": "application/json ",
        },
      });
    } catch (err) {
      console.error(err);
    }

    setSelectedImage(null); // Clear the selected image
    setImageToUpload(null); // Clear the image to upload
    alert("Book added to library successfully");
    setShowLibrary(!showLibrary);
    handleClose();
  };

  const renderDetails = () => {
    if (!selectedCategory) return null;

    const categoryData = data.find((item) => item.name === selectedCategory);

    if (!categoryData) return null;

    return (
      <>
        <Typography>Engagement: {categoryData.Engagement}</Typography>
        <Typography>Posts: {categoryData.Posts}</Typography>
        <Typography>Discussions: {categoryData.Discussions}</Typography>
      </>
    );
  };

  const handleDownload = async () => {
    const categoryData = data.find((item) => item.name === selectedCategory);
    if (!categoryData) return;

    if (categoryData.Engagement < 2)
      return alert("Engagement requirements not reached for this action.");

    let summary = "";
    if (categoryData.PostContent.length !== 0) {
      const summaryResponse = await axios.get(
        `${API_URL}/analytics/article?category=${encodeURIComponent(
          selectedCategory
        )}`,
        {
          headers: {
            Authorization: token,
          },
        }
      );

      if (summaryResponse.data) {
        if (
          summaryResponse.data.article &&
          summaryResponse.data.article.engagement === categoryData.Engagement
        ) {
          summary = `${summaryResponse.data.article.title}\n${summaryResponse.data.article.content}`;
        } else {
          // Start the `toSummarize` structure
          const toSummarize = {
            category: selectedCategory, // Selected category (e.g., Health & Wellness)
            posts: categoryData.PostContent.map((content, index) => {
              return {
                content, // Post content
                comments: categoryData.PostComments[index], // Associated comments
              };
            }),
          };

          const response = await axios.post(
            `${OPENAI_URL}/article`,
            toSummarize,
            {
              headers: {
                Authorization: token,
              },
            }
          );

          summary = response.data.summary;
          const title = summary.split("\n")[0]; // Extract the first line as the title
          summary = summary.split("\n").slice(1).join("\n"); // Remove the first line from the summary

          const generatedArticleToSave = {
            engagement: categoryData.Engagement,
            title: title,
            fullTitle: title,
            content: summary,
            category: selectedCategory,
          };

          if (summaryResponse.data.article) {
            await axios.put(
              `${API_URL}/analytics/article?category=${encodeURIComponent(
                selectedCategory
              )}`,
              generatedArticleToSave,
              {
                headers: {
                  Authorization: token,
                },
              }
            );
          } else {
            await axios.post(
              `${API_URL}/analytics/article`,
              generatedArticleToSave,
              {
                headers: {
                  Authorization: token,
                },
              }
            );
          }
          // Re assign the summary to include title
          summary = response.data.summary;
        }
      }
    }

    const doc = new jsPDF();

    const logoUrl = "img/logo3.png";
    const logoImage = new Image();
    logoImage.src = logoUrl;

    logoImage.onload = () => {
      const logoWidth = 10;
      const logoHeight = (logoWidth * logoImage.height) / logoImage.width;

      const logoX = 10;
      const logoY = 17;
      doc.addImage(logoImage, "PNG", logoX, logoY, logoWidth, logoHeight);

      doc.setFont("Times", "bold");
      doc.setFontSize(14);
      const matriCareText = "MatriCare";
      const matriCareX = logoX + logoWidth + 2;
      const matriCareY = logoY + logoHeight / 5 + 4;
      doc.text(matriCareText, matriCareX, matriCareY);

      doc.setFont("Times", "normal");
      doc.setFontSize(12);
      doc.setTextColor(128, 128, 128);
      const categoryText = `Category: ${selectedCategory}`;
      const categoryX = matriCareX + doc.getTextWidth(matriCareText) + 10;
      const categoryY = matriCareY;
      doc.text(categoryText, categoryX, categoryY);

      doc.setTextColor(0, 0, 0);

      const lineY = categoryY + 5;
      const lineStartX = categoryX;
      const lineEndX = 200;
      doc.setDrawColor(0);
      doc.line(lineStartX, lineY, lineEndX, lineY);

      // Header
      doc.setFontSize(20);
      doc.setFont("Times", "bold");
      const headerX = categoryX;
      doc.text(selectedCategory, headerX, 40);

      // Date
      doc.setFontSize(12);
      doc.setFont("Times", "normal");
      const dateText = `Date: ${new Date().toLocaleDateString()}`;
      const dateY = 50;
      doc.text(dateText, headerX, dateY);

      // Date Line
      const dateLineY = dateY + 10;
      doc.line(headerX, dateLineY, 200, dateLineY);

      // Engagement Overview
      doc.setFontSize(12);
      doc.setFont("Times", "bold");
      const overviewTitle = "Engagement Overview";
      const overviewY = dateLineY + 10;
      doc.text(overviewTitle, headerX, overviewY);

      doc.setFont("Times", "normal");

      const baseY = overviewY + 15;
      const countY = baseY;
      const labelY = baseY + 10;

      const engagementData = [
        { count: categoryData.Posts, label: "Total Posts" },
        { count: categoryData.Engagement, label: "Total Engagement" },
        { count: categoryData.Discussions, label: "Total Discussions" },
      ];

      const pageWidth = doc.internal.pageSize.getWidth();
      const countLabelWidth = pageWidth - 1.5 * headerX;
      const countXOffset = countLabelWidth / engagementData.length;

      engagementData.forEach((item, index) => {
        const currentX = headerX + index * countXOffset;

        doc.setTextColor(154, 108, 180);
        doc.setFontSize(18);
        doc.setFont("Times", "bold");

        // Get the count text
        const countText = item.count.toString();
        const countWidth = doc.getTextWidth(countText);
        const centeredCountX = currentX + (countXOffset - countWidth) / 2;

        // Draw count
        doc.text(countText, centeredCountX, countY);

        // Reset color for label
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12); // Set back to the default size for labels
        doc.setFont("Times", "normal");

        const labelText = item.label;
        const labelWidth = doc.getTextWidth(labelText);
        const centeredLabelX = currentX + (countXOffset - labelWidth) / 2;

        // Draw label
        doc.text(labelText, centeredLabelX, labelY);
      });

      const engagementLineY = labelY + 10;
      doc.setDrawColor(0);
      doc.line(headerX, engagementLineY, 200, engagementLineY);

      // Position for the summary
      const summaryYStart = engagementLineY + 10;
      const summaryX = headerX;
      doc.setFont("Times", "bold");
      doc.text("Summary:", summaryX, summaryYStart);

      doc.setFont("Times", "normal");
      doc.setTextColor(51, 51, 51);

      const summaryContentY = summaryYStart + 7;
      const summaryLines = doc.splitTextToSize(`\n${summary}`, countLabelWidth);

      let currentY = summaryContentY;
      summaryLines.forEach((line, index) => {
        if (currentY > 280) {
          doc.addPage();
          currentY = 20; // Reset Y position for new page
        }
        doc.text(line, summaryX, currentY);
        currentY += 7; // Increment Y position for next line
      });

      // Add footer with a horizontal line above the page number
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        const footerY = 290; // Y position for the footer
        doc.line(10, footerY - 5, 200, footerY - 5); // Draw line above the page number
        doc.text(
          `Page ${i} of ${pageCount}`,
          190,
          footerY,
          null,
          null,
          "right"
        );
      }

      // Save the PDF
      doc.save(`${selectedCategory}_data.pdf`);
    };
  };

  async function fetchPosts() {
    try {
      const response = await axios.get(`${API_URL}/analytics`, {
        headers: {
          Authorization: token,
        },
      });

      const formattedData = {};

      // Define the categories you want to initialize
      const categoriesList = [
        "Health & Wellness",
        "Finance & Budgeting",
        "Parenting & Family",
        "Baby’s Essentials",
        "Exercise & Fitness",
        "Labor & Delivery",
      ];

      // Initialize all categories to zero counts
      categoriesList.forEach((category) => {
        formattedData[category] = {
          name: category,
          Engagement: 0,
          Posts: 0,
          Discussions: 0,
          PostContent: [],
          PostComments: [],
        };
      });

      // Check if posts data exists
      if (response.data && response.data.category) {
        // Process each post in the response
        response.data.category.forEach((list) => {
          const categories = Array.isArray(list.category)
            ? list.category
            : [list.category];

          categories.forEach((category) => {
            // If the category exists in formattedData, update its values
            if (formattedData[category]) {
              // Increment counts for the category

              formattedData[category].Engagement +=
                list.posts.length + list.comments.length;

              formattedData[category].Posts += list.posts
                ? list.posts.length
                : 0;
              formattedData[category].Discussions += list.comments
                ? list.comments.length
                : 0;

              // Append the content of the post to the array
              if (list.posts && Array.isArray(list.posts)) {
                // Append the content of each post to the array
                formattedData[category].PostContent.push(
                  list.posts.map((posts) => posts.content)
                );
              } else {
                formattedData[category].PostContent.push([]);
              }

              // Append the comments if any, otherwise push an empty array
              if (list.comments && Array.isArray(list.comments)) {
                formattedData[category].PostComments.push(
                  list.comments.map((comment) => comment.content)
                );
              } else {
                formattedData[category].PostComments.push([]);
              }
            }
          });
        });
      }
      setData(Object.values(formattedData)); // Set the accumulated data for Recharts
    } catch (error) {
      console.error("Error fetching posts data: ", error);
    }
  }
  useEffect(() => {
    const userData = localStorage.getItem("userData");

    if (userData) {
      const parsedUserData = JSON.parse(userData);
      setUser(parsedUserData);
    }
    fetchPosts(); // Fetch data on component mount
  }, []);

  return (
    <Box className="manage-bellytalk-container">
      <Box className="manage-bellytalk-main-container">
        <h2>BellyTalk Dashboard</h2>

        <div className="manage-bellytalk-category-cards">
          <div
            className="manage-bellytalk-category-card health"
            onClick={() => handleCardClick("Health & Wellness")}
          >
            Health & Wellness
          </div>
          <div
            className="manage-bellytalk-category-card finance"
            onClick={() => handleCardClick("Finance & Budgeting")}
          >
            Finance & Budgeting
          </div>
          <div
            className="manage-bellytalk-category-card parenting"
            onClick={() => handleCardClick("Parenting & Family")}
          >
            Parenting & Family
          </div>
          <div
            className="manage-bellytalk-category-card essentials"
            onClick={() => handleCardClick("Baby’s Essentials")}
          >
            Baby's Essentials
          </div>
          <div
            className="manage-bellytalk-category-card exercise"
            onClick={() => handleCardClick("Exercise & Fitness")}
          >
            Exercise & Fitness
          </div>
          <div
            className="manage-bellytalk-category-card labor"
            onClick={() => handleCardClick("Labor & Delivery")}
          >
            Labor & Delivery
          </div>
        </div>

        {/* Recharts Bar Graph */}
        <Box className="manage-bellytalk-chart">
          <Typography variant="h5">Category Engagement Overview</Typography>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Posts" fill="#9DC3E2" />
              <Bar dataKey="Engagement" fill="#e39fa9" />
              <Bar dataKey="Discussions" fill="#9a6cb4af" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      <Dialog open={open} onClose={handleClose}>
        <DialogActions></DialogActions>
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography className="dialog-title-text">
              {selectedCategory}
            </Typography>
            <IconButton onClick={handleClose} className="dialog-close-button">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>{renderDetails()}</DialogContent>
        <div className="dialog-button-container">
          <Button
            onClick={handleDownload}
            className="dialog-download-button"
            startIcon={<DownloadIcon />}
          >
            Download
          </Button>

          <Button
            onClick={handleViewReports}
            className="dialog-download-button"
            startIcon={<ReportIcon />}
          >
            {showReport ? "Hide Reports" : "View Reports"}
          </Button>

          <Button
            className="dialog-download-button"
            onClick={handleShowAddToLibrary}
            startIcon={<LibraryAddIcon />}
          >
            Add to Library
          </Button>
        </div>
      </Dialog>
      {showReport && (
        <Dialog
          open={showReport}
          onClose={handleViewReports}
          sx={{
            "& .MuiDialog-paper": {
              width: "80%", // Adjust the width
              maxHeight: "80%", // Adjust the max height
              height: "800px", // Adjust the height of the dialog
            },
            "& .MuiDialogContent-root": {
              maxHeight: "60vh", // Set max height for content
              overflowY: "auto", // Make it scrollable
            },
          }}
        >
          <DialogTitle>
            <Typography variant="h6">Reports</Typography>
            <IconButton
              edge="end"
              color="inherit"
              onClick={handleViewReports}
              aria-label="close"
              sx={{
                position: "absolute",
                top: 8,
                right: 20,
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              {reportData && !isFetchingReport ? (
                <ReactMarkdown>{reportData.toString()}</ReactMarkdown>
              ) : isFetchingReport ? (
                "Fetching Report..."
              ) : (
                "No report available"
              )}
            </Typography>
          </DialogContent>
        </Dialog>
      )}

      {showLibrary && (
        <Dialog
          open={showLibrary}
          onClose={handleCloseModal}
          sx={{
            "& .MuiDialog-paper": {
              width: "80%", // Adjust the width
              maxHeight: "80%", // Adjust the max height
              height: "800px", // Adjust the height of the dialog
            },
            "& .MuiDialogContent-root": {
              maxHeight: "60vh", // Set max height for content
              overflowY: "auto", // Make it scrollable
            },
          }}
        >
          <DialogTitle>
            <Typography variant="h6">Add to Library</Typography>
            <IconButton
              edge="end"
              color="inherit"
              onClick={handleCloseModal}
              aria-label="close"
              sx={{
                position: "absolute",
                top: 8,
                right: 20,
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <label
              htmlFor="cover-image-input"
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                marginBottom: "10px",
                display: "block", // Make the label block-level so it appears above the input
              }}
            >
              Choose a Cover image
            </label>

            <input
              type="file"
              id="cover-image-input" // Associating the input with the label
              accept="image/*"
              onChange={handleFileChange}
              style={{
                marginTop: "10px",
                display: "block", // Ensures input is on its own line
              }}
            />

            {/* Show image preview if an image is selected */}
            {selectedImage && (
              <div style={{ position: "relative", marginTop: "20px" }}>
                <img
                  src={selectedImage}
                  alt="Preview"
                  style={{
                    maxWidth: "30%",
                    height: "auto",
                    display: "block",
                    margin: "0 auto",
                  }}
                />

                {/* Close button */}
                <Button
                  onClick={handleRemoveImage}
                  style={{
                    position: "absolute",
                    top: "5px",
                    right: "195px",
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    color: "white",
                    borderRadius: "50%",
                    padding: "5px",
                    minWidth: "0",
                    height: "25px",
                    width: "25px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: "16px",
                  }}
                >
                  ×
                </Button>
              </div>
            )}
            {reportData && !isFetchingReport ? (
              <ReactMarkdown>{reportData.toString()}</ReactMarkdown>
            ) : isFetchingReport ? (
              "Fetching Report..."
            ) : (
              "No report available"
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal} color="primary">
              Cancel
            </Button>
            <Button onClick={handleAddToLibrary} color="primary">
              Add to Library
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default ManageBellyTalk;
